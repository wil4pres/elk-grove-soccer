/**
 * DynamoDB-backed matching/scoring engine.
 *
 * Replaces the SQLite generate-report.ts scoring logic.
 * Reads from egs-players, egs-teams, egs-assignments.
 */

import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from './dynamo'

// ─── types ──────────────────────────────────────────────────────────────────────

export interface MatchPlayer {
  player_id: string
  first_name: string
  last_name: string
  gender: string
  birth_date: string
  account_email: string
  zip: string
  address: string
  city: string
  state: string
  package_name: string
  school_and_grade: string
  special_request: string
  new_or_returning: string
  lat?: number
  lng?: number
  extraction_coaches?: string[]
  extraction_friends?: string[]
  extraction_teams?: string[]
  extraction_notes?: string
  prev_team: string
  prev_season: string
}

export interface MatchTeam {
  team_id: string
  team_name: string
  season: string
  birth_year: string
  gender: string
  coach_last_name: string
  practice_field?: string
}

export interface Suggestion {
  team: string
  score: number
  reasons: string[]
}

export interface Recommendation {
  text: string
  level: 'green' | 'yellow' | 'orange' | 'red'
}

export interface ScoredPlayer {
  player: MatchPlayer
  suggestions: Suggestion[]
  recommendation: Recommendation
}

export interface PackageResult {
  package_name: string
  players: ScoredPlayer[]
  stats: {
    total: number
    returning: number
    withRequests: number
    matched: number
    needReview: number
  }
}

// ─── DynamoDB helpers ───────────────────────────────────────────────────────────

async function scanTable<T>(tableName: string, filterSeason?: string): Promise<T[]> {
  const items: T[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const params: Record<string, unknown> = {
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }
    if (filterSeason) {
      Object.assign(params, {
        FilterExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': filterSeason },
      })
    }
    const res = await db.send(new ScanCommand(params as any))
    for (const item of res.Items ?? []) items.push(item as T)
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return items
}

// ─── data loading ───────────────────────────────────────────────────────────────

export async function loadMatchingData(season: string) {
  const seasonYear = parseInt(season)

  // Load current season players, ALL teams (for coach lookups), and ALL assignments (for history)
  const [rawPlayers, allTeams, allAssignments] = await Promise.all([
    scanTable<Record<string, any>>('egs-players', season),
    scanTable<MatchTeam>('egs-teams'),
    scanTable<Record<string, any>>('egs-assignments'),
  ])

  // Build previous assignment lookup: player_id → most recent rostered team
  // Looks back across ALL previous seasons, most recent first
  const prevTeamMap = new Map<string, { team: string; season: string }>()
  const prevAssignments = allAssignments
    .filter(a => a.season !== season && a.assignment_status?.toLowerCase() === 'rostered')
    .sort((a, b) => parseInt(b.season || '0') - parseInt(a.season || '0'))

  for (const a of prevAssignments) {
    if (!prevTeamMap.has(a.player_id)) {
      prevTeamMap.set(a.player_id, { team: a.team_name ?? '', season: a.season ?? '' })
    }
  }

  // Transform players
  const players: MatchPlayer[] = rawPlayers.map(p => {
    const prev = prevTeamMap.get(p.player_id)
    return {
      player_id: p.player_id ?? '',
      first_name: p.player_first_name ?? '',
      last_name: p.player_last_name ?? '',
      gender: p.gender ?? '',
      birth_date: p.birth_date ?? '',
      account_email: p.account_email ?? '',
      zip: p.zip ?? '',
      address: p.address ?? '',
      city: p.city ?? '',
      state: p.state ?? '',
      package_name: p.package_name ?? '',
      school_and_grade: p.school_and_grade ?? '',
      special_request: p.special_request ?? '',
      new_or_returning: p.new_or_returning ?? '',
      lat: p.lat,
      lng: p.lng,
      extraction_coaches: p.extraction_coaches,
      extraction_friends: p.extraction_friends,
      extraction_teams: p.extraction_teams,
      extraction_notes: p.extraction_notes,
      prev_team: prev?.team ?? '',
      prev_season: prev?.season ?? '',
    }
  })

  // Group players by package
  const packages = [...new Set(players.map(p => p.package_name).filter(Boolean))].sort()
  const playersByPackage = new Map<string, MatchPlayer[]>()
  for (const p of players) {
    if (!p.package_name) continue
    if (!playersByPackage.has(p.package_name)) playersByPackage.set(p.package_name, [])
    playersByPackage.get(p.package_name)!.push(p)
  }

  // ONLY current season teams are candidates for scoring.
  // Previous season teams are used for coach name lookups only — never as candidates.
  const currentTeams = allTeams.filter(t => t.season === season)
  const prevTeams = allTeams.filter(t => t.season !== season)

  return { packages, playersByPackage, currentTeams, prevTeams, seasonYear }
}

// ─── scoring ────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/['\u2019\-.]/g, '')
}

function getTeamsForPackage(pkg: string, teams: MatchTeam[], seasonYear: number): MatchTeam[] {
  const yearMatch = pkg.match(/(\d{4})/)
  if (!yearMatch) return []
  const year = yearMatch[1]
  const gCode = pkg.toLowerCase().includes('girl') ? 'G' : 'B'
  const gFull = gCode === 'G' ? 'Female' : 'Male'
  const uAge = (seasonYear + 1) - parseInt(year)

  return teams.filter(t => {
    if (t.birth_year === year && (t.gender === gFull || t.gender === gCode)) return true
    const nameUpper = t.team_name.toUpperCase()
    if (nameUpper.includes(`${year}${gCode}`)) return true
    if (nameUpper.includes(`U${uAge}${gCode}`) || nameUpper.includes(`U${uAge} ${gCode}`)) return true
    return false
  })
}

function score(
  player: MatchPlayer,
  team: MatchTeam,
  allPlayers: MatchPlayer[],
  prevTeams: MatchTeam[],
): Suggestion {
  const reasons: string[] = []
  let total = 0
  const req = (player.special_request || '').toLowerCase()
  const reqNorm = norm(player.special_request || '')

  // +3 previous team match
  if (player.prev_team && player.prev_team === team.team_name) {
    total += 3
    reasons.push('Returning to same team')
    const playerBY = parseInt(player.birth_date?.slice(-4) ?? player.birth_date?.slice(0, 4) ?? '0')
    const teamYear = parseInt(team.birth_year || '0')
    if (teamYear && playerBY && teamYear !== playerBY) {
      reasons.push(`Playing up/down (born ${playerBY}, team ${teamYear}) — coordinator verify`)
    }
  }

  // +3 coach name match
  if (team.coach_last_name && team.coach_last_name.length > 2) {
    const coachNorm = norm(team.coach_last_name)
    if (reqNorm.includes(coachNorm)) {
      total += 3
      reasons.push(`Requested coach "${team.coach_last_name}"`)
    }
  }

  // Also check coaches from previous season teams with same name
  if (!reasons.some(r => r.includes('Requested coach'))) {
    const prevTeam = prevTeams.find(t => t.team_name === team.team_name)
    if (prevTeam?.coach_last_name && prevTeam.coach_last_name.length > 2) {
      if (reqNorm.includes(norm(prevTeam.coach_last_name))) {
        total += 3
        reasons.push(`Requested coach "${prevTeam.coach_last_name}"`)
      }
    }
  }

  // +2 team nickname
  const nickMatch = team.team_name.match(/\d{4}[BG]\s+(.+?)\s+\(/) ||
                    team.team_name.match(/U\d+\s*[BG]\s+(.+?)\s+\(/)
  if (nickMatch) {
    const nickLower = nickMatch[1].toLowerCase()
    const nickWords = nickLower.split(/\s+/).filter(w => w.length > 4)
    if (req.includes(nickLower) || nickWords.some(w => req.includes(w))) {
      total += 2
      reasons.push(`Requested team "${nickMatch[1]}"`)
    }
  }

  // +2/+4 friend/player request
  for (const tp of allPlayers.filter(p => p.player_id !== player.player_id)) {
    const fLast = norm(tp.last_name)
    const fFirst = norm(tp.first_name)
    if ((fLast.length > 2 && reqNorm.includes(fLast)) || (fFirst.length > 3 && reqNorm.includes(fFirst))) {
      if (tp.prev_team === team.team_name) {
        const isMutual = norm(tp.special_request || '').includes(norm(player.last_name))
        total += isMutual ? 4 : 2
        reasons.push(`${isMutual ? 'Mutual' : 'One-way'} friend: ${tp.first_name} ${tp.last_name}`)
      } else if (!tp.prev_team && !reasons.some(r => r.includes(tp.first_name))) {
        reasons.push(`Player request: ${tp.first_name} ${tp.last_name} (no prev team)`)
      }
    }
  }

  // +2 sibling on team
  if (player.account_email) {
    const siblings = allPlayers.filter(
      p => p.player_id !== player.player_id &&
           p.account_email === player.account_email &&
           p.prev_team === team.team_name
    )
    if (siblings.length > 0) {
      total += 2
      reasons.push('Sibling on this team')
    }
  }

  // +1 same school
  if (player.school_and_grade && player.school_and_grade.length > 4) {
    const schoolWords = player.school_and_grade.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const teamPlayers = allPlayers.filter(p => p.player_id !== player.player_id && p.prev_team === team.team_name)
    const sameSchool = teamPlayers.filter(tp => {
      const tpSchool = (tp.school_and_grade || '').toLowerCase()
      return schoolWords.some(w => tpSchool.includes(w))
    })
    if (sameSchool.length > 0) {
      total += 1
      reasons.push(`Same school as ${sameSchool.length} teammate(s)`)
    }
  }

  return { team: team.team_name, score: total, reasons }
}

function getSuggestions(
  player: MatchPlayer,
  teams: MatchTeam[],
  allPlayers: MatchPlayer[],
  prevTeams: MatchTeam[],
): Suggestion[] {
  // ONLY score against current season teams — never previous year teams.
  // Previous team history is used as a scoring SIGNAL, not a candidate.
  return teams
    .map(t => score(player, t, allPlayers, prevTeams))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

// ─── AI recommendation ─────────────────────────────────────────────────────────

function recommend(player: MatchPlayer, suggestions: Suggestion[]): Recommendation {
  const req = (player.special_request || '').trim()
  const hasReq = req && !['n/a', 'na', 'none', '-'].includes(req.toLowerCase())
  const top = suggestions[0]
  const isNew = (player.new_or_returning || '').toLowerCase().includes('new')

  if (!suggestions.length) {
    if (isNew && !hasReq)
      return { level: 'orange', text: 'New player with no request — assign based on school/zip or coordinator preference.' }
    if (hasReq)
      return { level: 'red', text: `Request "${req}" could not be matched to a known team or coach. Manual lookup required.` }
    return { level: 'orange', text: 'No match found. Place manually based on availability.' }
  }

  const reasons = top.reasons
  const hasPlayingUp = reasons.some(r => r.includes('Playing up'))
  const hasPrevTeam = reasons.some(r => r.includes('Returning'))
  const hasCoachReq = reasons.some(r => r.includes('Requested coach'))
  const hasTeamReq = reasons.some(r => r.includes('Requested team'))
  const hasMutual = reasons.some(r => r.includes('Mutual friend'))
  const hasOneway = reasons.some(r => r.includes('One-way friend'))
  const hasSibling = reasons.some(r => r.includes('Sibling'))
  const hasSchool = reasons.some(r => r.includes('school'))

  if (hasPlayingUp)
    return { level: 'yellow', text: `Previously on ${top.team} but age group differs — coordinator verify if playing up again.` }

  if (hasPrevTeam && hasReq && !hasCoachReq && !hasTeamReq)
    return { level: 'yellow', text: `Was on ${player.prev_team} last year but has a new request ("${req}"). Confirm with family before reassigning.` }

  if (top.score >= 6 && hasPrevTeam && (hasCoachReq || hasTeamReq))
    return { level: 'green', text: `Assign to ${top.team}. Returning player who also requested this coach/team — strong alignment.` }

  if (top.score >= 5 && hasPrevTeam && !hasReq)
    return { level: 'green', text: `Return to ${top.team}. Same team as last year, no change requested.` }

  if (top.score >= 5 && (hasCoachReq || hasTeamReq))
    return { level: 'green', text: `Assign to ${top.team}. Player explicitly requested this ${hasCoachReq ? 'coach' : 'team'}.` }

  if (top.score >= 5 && hasMutual) {
    const mutualCount = reasons.filter(r => r.includes('Mutual')).length
    return { level: 'green', text: `Place on ${top.team}. Part of a mutual friend group (${mutualCount} mutual request${mutualCount > 1 ? 's' : ''}).` }
  }

  if (hasSibling)
    return { level: 'green', text: `Assign to ${top.team}. Sibling already on this team — keep family together.` }

  if (top.score >= 3 && (hasOneway || hasSchool)) {
    const detail = hasOneway ? 'friend request' : 'shared school'
    return { level: 'yellow', text: `Consider ${top.team} based on ${detail}. Score ${top.score}/10 — verify with coordinator.` }
  }

  if (isNew && hasReq && (hasCoachReq || hasTeamReq))
    return { level: 'green', text: `New player — assign to ${top.team} per their request.` }

  if (isNew)
    return { level: 'yellow', text: `New player. Best available match is ${top.team} (score ${top.score}/10). Coordinator should confirm.` }

  if (top.score <= 2)
    return { level: 'orange', text: `Weak signals only (score ${top.score}/10). Best guess: ${top.team}. Recommend coordinator review.` }

  return { level: 'yellow', text: `Suggest ${top.team} (score ${top.score}/10). Review reasons before confirming.` }
}

// ─── main entry point ───────────────────────────────────────────────────────────

export async function runScoring(season: string): Promise<PackageResult[]> {
  const { packages, playersByPackage, currentTeams, prevTeams, seasonYear } =
    await loadMatchingData(season)

  const results: PackageResult[] = []

  for (const pkg of packages) {
    const players = playersByPackage.get(pkg) ?? []
    const teams = getTeamsForPackage(pkg, currentTeams, seasonYear)

    const scoredPlayers: ScoredPlayer[] = players
      .map(player => {
        const suggestions = getSuggestions(player, teams, players, prevTeams)
        const recommendation = recommend(player, suggestions)
        return { player, suggestions, recommendation }
      })
      .sort((a, b) => (b.suggestions[0]?.score ?? -1) - (a.suggestions[0]?.score ?? -1))

    const withSuggestions = scoredPlayers.filter(s => s.suggestions.length > 0).length
    const SKIP = new Set(['n/a', 'na', 'none', '-', ''])

    results.push({
      package_name: pkg,
      players: scoredPlayers,
      stats: {
        total: players.length,
        returning: players.filter(p => p.prev_team).length,
        withRequests: players.filter(p => p.special_request && !SKIP.has(p.special_request.toLowerCase().trim())).length,
        matched: withSuggestions,
        needReview: players.length - withSuggestions,
      },
    })
  }

  return results
}
