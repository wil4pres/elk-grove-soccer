/**
 * Assignment Scoring Engine
 *
 * Scores all eligible teams for a player and returns a ranked list.
 * Ported and improved from matching/generate-report.ts.
 *
 * Scoring weights (total = 100):
 *   Proximity to practice field   30 pts
 *   Requested coach match         25 pts
 *   Friend on same team           20 pts
 *   Sibling same practice night   15 pts
 *   Returning player bonus         5 pts
 *   Team has open capacity         5 pts
 */

import Anthropic from '@anthropic-ai/sdk'
import { se } from '../mock/provider.js'
import type { ScoreBreakdown } from '../dynamo/schema.js'
import type { SETeam, SEProfile, SERegistration } from '../types/sportsengine.js'

export const RULE_VERSION = '1.0.0'

const MODEL = 'claude-haiku-4-5-20251001' // fast + cheap for extraction

// ─── Geo distance ─────────────────────────────────────────────────────────────

/** Haversine straight-line distance in miles (road distance not available without ORS) */
function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8 // Earth radius miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function proximityScore(distanceMiles: number | null): number {
  if (distanceMiles === null) return 10 // no data — neutral score
  if (distanceMiles <= 2)  return 30
  if (distanceMiles <= 4)  return 25
  if (distanceMiles <= 6)  return 20
  if (distanceMiles <= 10) return 12
  if (distanceMiles <= 15) return 6
  return 2
}

// ─── AI request extraction ────────────────────────────────────────────────────

export interface ExtractedRequest {
  coaches: string[]
  friends: string[]
  teams: string[]
  notes: string
}

export async function extractSpecialRequest(
  raw: string,
): Promise<ExtractedRequest> {
  if (!raw || raw.trim().length < 3) {
    return { coaches: [], friends: [], teams: [], notes: '' }
  }

  const client = new Anthropic()
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Extract structured data from this youth soccer special request. Return JSON only.

Request: "${raw}"

Return exactly:
{
  "coaches": ["coach last name or full name"],
  "friends": ["player full name or first name"],
  "teams": ["team name if mentioned"],
  "notes": "anything else relevant"
}

If nothing found for a field, return an empty array or empty string.`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
  try {
    return JSON.parse(text) as ExtractedRequest
  } catch {
    return { coaches: [], friends: [], teams: [], notes: text }
  }
}

// ─── AI explanation ───────────────────────────────────────────────────────────

export async function generateExplanation(
  player: SEProfile,
  assignedTeam: SETeam,
  breakdown: ScoreBreakdown,
  extracted: ExtractedRequest,
): Promise<string> {
  const client = new Anthropic()
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a brief, friendly explanation (2-3 sentences) for why ${player.firstName} ${player.lastName} was placed on ${assignedTeam.name}.

Score breakdown:
- Proximity to practice field: ${breakdown.proximityScore}/30 (${breakdown.distanceMiles?.toFixed(1) ?? 'unknown'} miles)
- Coach match: ${breakdown.coachMatchScore}/25 (requested: ${extracted.coaches.join(', ') || 'none'})
- Friend match: ${breakdown.friendMatchScore}/20 (requested: ${extracted.friends.join(', ') || 'none'})
- Sibling schedule: ${breakdown.siblingScheduleScore}/15
- Total: ${breakdown.totalScore}/100

Write as if explaining to the coordinator reviewing this assignment. Be factual and specific.`,
      },
    ],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

// ─── Main scoring function ────────────────────────────────────────────────────

export interface ScoringResult {
  profileId: string
  seasonId: string
  registrationResultId: string
  extracted: ExtractedRequest
  ranked: ScoreBreakdown[]
  topTeam: ScoreBreakdown | null
  isException: boolean       // true if no team with capacity scores above threshold
  exceptionReason?: string
  ruleVersion: string
}

export async function scorePlayer(
  profileId: string,
  seasonId: string,
  registrationResultId: string,
): Promise<ScoringResult> {
  // Load player data
  const [profile, registration, siblings] = await Promise.all([
    se.getProfile(profileId),
    se.listRegistrations(seasonId).then(regs => regs.find(r => r.profileId === profileId)),
    se.getSiblings(profileId),
  ])

  if (!registration) {
    throw new Error(`No registration found for profile ${profileId} in season ${seasonId}`)
  }

  // Extract structured requests from free text
  const extracted = await extractSpecialRequest(registration.specialRequest ?? '')

  // Get eligible teams — matching gender + birth year + has capacity
  const allTeams = await se.listTeams(seasonId)
  const playerBirthYear = profile.birthDate
    ? new Date(profile.birthDate).getFullYear()
    : null

  const eligibleTeams = allTeams.filter(t => {
    if (t.gender !== (profile.gender === 'male' ? 'male' : 'female') && t.gender !== 'coed') return false
    if (playerBirthYear && t.birthYear !== playerBirthYear) return false
    return true
  })

  if (eligibleTeams.length === 0) {
    return {
      profileId,
      seasonId,
      registrationResultId,
      extracted,
      ranked: [],
      topTeam: null,
      isException: true,
      exceptionReason: `No teams found for ${profile.gender} born ${playerBirthYear} in season ${seasonId}`,
      ruleVersion: RULE_VERSION,
    }
  }

  // Get sibling team assignments (for schedule alignment)
  const siblingTeamIds = new Set<string>()
  for (const sib of siblings) {
    const sibRegs = await se.listRegistrationResults(seasonId)
    const sibRR = sibRegs.find(r => r.profileId === sib.id && r.teamId)
    if (sibRR?.teamId) siblingTeamIds.add(sibRR.teamId)
  }

  // Get teams siblings are already on (for schedule alignment, not same-team)
  const siblingTeams = allTeams.filter(t => siblingTeamIds.has(t.id))

  // Score each team
  const ranked: ScoreBreakdown[] = eligibleTeams.map(team => {
    const hasCapacity = team.currentRosterSize < team.maxRosterSize

    // Proximity
    let distanceMiles: number | null = null
    if (
      profile.address?.lat && profile.address?.lon &&
      team.practiceVenueId
    ) {
      // In production: use ORS road-network distance
      // In mock: use haversine as approximation
      const venue = { lat: 38.4051, lon: -121.3698 } // placeholder — provider.getVenue() in production
      distanceMiles = haversineDistanceMiles(
        profile.address.lat, profile.address.lon,
        venue.lat, venue.lon,
      )
    }
    const proxScore = proximityScore(distanceMiles)

    // Coach match
    const coachScore = extracted.coaches.some(c =>
      team.headCoachName?.toLowerCase().includes(c.toLowerCase())
    ) ? 25 : 0

    // Friend match — check if any requested friend is already on this team
    // (In production: query egs-assignments for friends already assigned to this team)
    const friendScore = 0 // resolved in production against assigned players

    // Sibling schedule — check if sibling's team practices same night
    const siblingScore = siblingTeams.some(st =>
      st.practiceSchedule?.split(' ')[0] === team.practiceSchedule?.split(' ')[0]
    ) ? 15 : 0

    // Returning player bonus
    const returningScore = registration.newOrReturning === 'returning' ? 5 : 0

    // Capacity bonus
    const capacityScore = hasCapacity ? 5 : 0

    const totalScore = proxScore + coachScore + friendScore + siblingScore + returningScore + capacityScore

    return {
      teamId: team.id,
      teamName: team.name,
      totalScore,
      proximityScore: proxScore,
      coachMatchScore: coachScore,
      friendMatchScore: friendScore,
      siblingScheduleScore: siblingScore,
      returningPlayerScore: returningScore,
      capacityScore,
      distanceMiles: distanceMiles ?? undefined,
      hasCapacity,
    }
  })

  // Sort: teams with capacity first, then by score
  ranked.sort((a, b) => {
    if (a.hasCapacity !== b.hasCapacity) return a.hasCapacity ? -1 : 1
    return b.totalScore - a.totalScore
  })

  const topTeam = ranked.find(t => t.hasCapacity) ?? null
  const isException = !topTeam || topTeam.totalScore < 10

  return {
    profileId,
    seasonId,
    registrationResultId,
    extracted,
    ranked,
    topTeam,
    isException,
    exceptionReason: isException ? 'No eligible team with capacity scores above threshold' : undefined,
    ruleVersion: RULE_VERSION,
  }
}

// ─── CLI runner ───────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('scoring.ts')
if (isMain) {
  // Demo: score first mock player
  scorePlayer('profile-player-001', 'season-spring-2026', 'rr-001')
    .then(result => {
      console.log('\n[Scoring Engine] Result')
      console.log('─'.repeat(60))
      console.log(`Player:      ${result.profileId}`)
      console.log(`Extracted:   coaches=${result.extracted.coaches.join(', ')||'none'} friends=${result.extracted.friends.join(', ')||'none'}`)
      console.log(`Exception:   ${result.isException}`)
      if (result.topTeam) {
        console.log(`Top team:    ${result.topTeam.teamName} (score: ${result.topTeam.totalScore}/100)`)
      }
      console.log('\nFull ranking:')
      result.ranked.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.teamName} — ${t.totalScore}/100 ${t.hasCapacity ? '' : '[FULL]'}`)
      })
    })
    .catch(console.error)
}
