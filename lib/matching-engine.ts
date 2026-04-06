/**
 * DynamoDB-backed matching/scoring engine.
 *
 * Replaces the SQLite generate-report.ts scoring logic.
 * Reads from egs-players, egs-teams, egs-assignments.
 */

import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
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
  extraction_siblings?: string[]
  extraction_teams?: string[]
  extraction_school?: string
  extraction_school_guessed?: boolean
  extraction_school_lat?: number
  extraction_school_lng?: number
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

// Query via season-index GSI when a season filter is provided (egs-players, egs-teams).
// Falls back to Scan for tables without the GSI (egs-assignments uses a full scan
// because the matching engine needs ALL seasons for historical context).
async function scanTable<T>(tableName: string, filterSeason?: string): Promise<T[]> {
  const items: T[] = []
  let lastKey: Record<string, unknown> | undefined

  if (filterSeason) {
    // Use Query on the season-index GSI — O(season size) instead of O(table size)
    do {
      const res = await db.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'season-index',
        KeyConditionExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': filterSeason },
        ExclusiveStartKey: lastKey,
      }))
      for (const item of res.Items ?? []) items.push(item as T)
      lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (lastKey)
  } else {
    // Full scan — used for egs-assignments (needs all seasons for history)
    do {
      const res = await db.send(new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey,
      }))
      for (const item of res.Items ?? []) items.push(item as T)
      lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (lastKey)
  }

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

  // Count already-confirmed assignments for current season: team_name → count
  // Coordinators use this to see how full a team is before placing another player
  const teamRosterCount = new Map<string, number>()
  for (const a of allAssignments) {
    if (a.season === season && a.assignment_status?.toLowerCase() === 'rostered') {
      const t = a.team_name ?? ''
      if (t) teamRosterCount.set(t, (teamRosterCount.get(t) ?? 0) + 1)
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
      extraction_siblings: p.extraction_siblings,
      extraction_teams: p.extraction_teams,
      extraction_school: p.extraction_school,
      extraction_school_guessed: p.extraction_school_guessed,
      extraction_school_lat: p.extraction_school_lat,
      extraction_school_lng: p.extraction_school_lng,
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

  return { packages, playersByPackage, currentTeams, prevTeams, seasonYear, teamRosterCount }
}

// ─── scoring ────────────────────────────────────────────────────────────────────

// Geocoded coordinates for EGS practice fields (sourced from Nominatim/OpenStreetMap)
const FIELD_COORDS: Record<string, { lat: number; lng: number }> = {
  'Carlisle Woods Park':  { lat: 38.469771, lng: -121.364675 },
  'Elk Grove Park':       { lat: 38.396225, lng: -121.371393 },
  'Gates Park':           { lat: 38.402149, lng: -121.349690 },
  'Hawkins Park':         { lat: 38.419878, lng: -121.482012 },
  'Jan Rau Park':         { lat: 38.387070, lng: -121.371459 },
  'Kunsting Park':        { lat: 38.393000, lng: -121.441692 },
  'Lichtenberger North':  { lat: 38.412310, lng: -121.424259 },
  'Miwok Park':           { lat: 38.415230, lng: -121.404072 },
  'Zehnder Park':         { lat: 38.421921, lng: -121.453847 },
}

function norm(s: string): string {
  return s.toLowerCase().replace(/['\u2019\-.]/g, '')
}

// ─── Roster capacity (from official EGS Playing Rules) ──────────────────────────
// Returns { preferred, max } for a given birth year in the current season
function teamCapacity(birthYear: string, seasonYear: number): { preferred: number; max: number } {
  const by = parseInt(birthYear || '0')
  if (!by) return { preferred: 18, max: 22 }
  const uAge = (seasonYear + 1) - by   // U-age = next calendar year minus birth year
  if (uAge <= 8)  return { preferred: 10, max: 12 }   // Future Stars
  if (uAge <= 10) return { preferred: 12, max: 14 }   // U9-U10
  if (uAge <= 12) return { preferred: 16, max: 18 }   // U11-U12
  return { preferred: 18, max: 22 }                    // U13-U19
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Detects "(brother)", "(sister)", "(siblings)" etc. in a special request
function detectSiblingRequest(req: string): { name: string; relation: string } | null {
  const m = req.match(/(?:player[-\s]*)?([A-Za-z]+(?:\s+[A-Za-z]+)+?)\s*\((brothers?|sisters?|siblings?)\)/i)
  if (!m) return null
  return { name: m[1].trim(), relation: m[2].toLowerCase() }
}

function findSibling(name: string, excludeId: string, allPlayers: MatchPlayer[]): MatchPlayer | null {
  const nl = name.toLowerCase()
  return allPlayers.find(p => {
    if (p.player_id === excludeId) return false
    const full = `${p.first_name} ${p.last_name}`.toLowerCase()
    return full === nl ||
      full.includes(nl) ||
      (nl.includes(p.last_name.toLowerCase()) && p.last_name.length > 2 && nl.includes(p.first_name.toLowerCase()))
  }) ?? null
}

function getTeamsForPackage(pkg: string, teams: MatchTeam[], seasonYear: number): MatchTeam[] {
  let year: string
  let uAge: number

  const yearMatch = pkg.match(/(\d{4})/)
  if (yearMatch) {
    year = yearMatch[1]
    uAge = (seasonYear + 1) - parseInt(year)
  } else {
    // "U10 Boys" / "U12 Girls" format — convert age to birth year
    const ageMatch = pkg.match(/[Uu](\d{1,2})/)
    if (!ageMatch) return []
    uAge = parseInt(ageMatch[1])
    year = String((seasonYear + 1) - uAge)
  }

  const gCode = pkg.toLowerCase().includes('girl') ? 'G' : 'B'
  const gFull = gCode === 'G' ? 'Female' : 'Male'

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
  teamRosterCount: Map<string, number>,
  seasonYear: number,
): Suggestion {
  const reasons: string[] = []
  let total = 0

  // Whether AI extraction has run for this player
  const aiRan = Array.isArray(player.extraction_coaches)

  // Raw text fallbacks (used only when AI hasn't run yet)
  const reqRaw = (player.special_request || '').toLowerCase()
  const reqNorm = norm(player.special_request || '')

  // AI-extracted lists (empty arrays when not yet extracted)
  const aiCoaches  = (player.extraction_coaches  ?? []).map(norm)
  const aiFriends  = (player.extraction_friends  ?? []).map(norm)
  const aiSiblings = (player.extraction_siblings ?? []).map(norm)
  const aiTeams    = (player.extraction_teams    ?? []).map(s => s.toLowerCase())

  // ── +3 previous team match ───────────────────────────────────────────────────
  if (player.prev_team && player.prev_team === team.team_name) {
    total += 3
    reasons.push('Returning to same team')
    const playerBY = parseInt(player.birth_date?.slice(-4) ?? player.birth_date?.slice(0, 4) ?? '0')
    const teamYear = parseInt(team.birth_year || '0')
    if (teamYear && playerBY && teamYear !== playerBY) {
      reasons.push(`Playing up/down (born ${playerBY}, team ${teamYear}) — coordinator verify`)
    }
  }

  // ── +3 coach name match ──────────────────────────────────────────────────────
  const coachMatched = (() => {
    if (!team.coach_last_name || team.coach_last_name.length <= 2) return false
    const cn = norm(team.coach_last_name)
    if (aiRan) return aiCoaches.some(c => c.includes(cn) || cn.includes(c))
    return reqNorm.includes(cn)
  })()
  if (coachMatched) {
    total += 3
    reasons.push(`Requested coach "${team.coach_last_name}"`)
  }

  // Also check same-name team's coach from previous season
  if (!coachMatched) {
    const prevTeam = prevTeams.find(t => t.team_name === team.team_name)
    if (prevTeam?.coach_last_name && prevTeam.coach_last_name.length > 2) {
      const pcn = norm(prevTeam.coach_last_name)
      const prevCoachMatched = aiRan
        ? aiCoaches.some(c => c.includes(pcn) || pcn.includes(c))
        : reqNorm.includes(pcn)
      if (prevCoachMatched) {
        total += 3
        reasons.push(`Requested coach "${prevTeam.coach_last_name}"`)
      }
    }
  }

  // ── +2 team nickname ─────────────────────────────────────────────────────────
  const nickMatch = team.team_name.match(/\d{4}[BG]\s+(.+?)\s+\(/) ||
                    team.team_name.match(/U\d+\s*[BG]\s+(.+?)\s+\(/)
  if (nickMatch) {
    const nickLower = nickMatch[1].toLowerCase()
    const nickWords = nickLower.split(/\s+/).filter(w => w.length > 4)
    const teamReqMatched = aiRan
      ? aiTeams.some(t => t.includes(nickLower) || nickWords.some(w => t.includes(w)) || nickLower.includes(t))
      : (reqRaw.includes(nickLower) || nickWords.some(w => reqRaw.includes(w)))
    if (teamReqMatched) {
      total += 2
      reasons.push(`Requested team "${nickMatch[1]}"`)
    }
  }

  // ── +2/+4 friend / player request ───────────────────────────────────────────
  for (const tp of allPlayers.filter(p => p.player_id !== player.player_id)) {
    const fLast  = norm(tp.last_name)
    const fFirst = norm(tp.first_name)
    const fFull  = norm(`${tp.first_name} ${tp.last_name}`)

    const friendMatched = aiRan
      ? aiFriends.some(f => f.includes(fLast) || f.includes(fFirst) || fFull.includes(f))
      : ((fLast.length > 2 && reqNorm.includes(fLast)) || (fFirst.length > 3 && reqNorm.includes(fFirst)))

    if (friendMatched) {
      if (tp.prev_team === team.team_name) {
        // Check if mutual: other player also lists this player as a friend
        const tpFriends = (tp.extraction_friends ?? []).map(norm)
        const tpAiRan = Array.isArray(tp.extraction_friends)
        const pLast = norm(player.last_name)
        const isMutual = tpAiRan
          ? tpFriends.some(f => f.includes(pLast) || f.includes(norm(player.first_name)))
          : norm(tp.special_request || '').includes(pLast)
        total += isMutual ? 4 : 2
        reasons.push(`${isMutual ? 'Mutual' : 'One-way'} friend: ${tp.first_name} ${tp.last_name}`)
      } else if (!tp.prev_team && !reasons.some(r => r.includes(tp.first_name))) {
        reasons.push(`Player request: ${tp.first_name} ${tp.last_name} (no prev team)`)
      }
    }
  }

  // ── +2 sibling on team (same account email, automatic) ───────────────────────
  if (player.account_email) {
    const emailSiblings = allPlayers.filter(
      p => p.player_id !== player.player_id &&
           p.account_email === player.account_email &&
           p.prev_team === team.team_name
    )
    if (emailSiblings.length > 0) {
      total += 2
      reasons.push('Sibling on this team')
    }
  }

  // ── Brother/sister request by name ──────────────────────────────────────────
  // Use AI-extracted siblings[] if available, else fall back to regex
  const siblingNames: string[] = aiRan
    ? (player.extraction_siblings ?? [])
    : (() => {
        const r = detectSiblingRequest(player.special_request || '')
        return r ? [r.name] : []
      })()

  for (const sibName of siblingNames) {
    const sib = findSibling(sibName, player.player_id, allPlayers)
    if (sib && sib.package_name === player.package_name) {
      if (sib.prev_team === team.team_name) {
        total += 5
        reasons.push(`Sibling request: ${sib.first_name} ${sib.last_name} was on this team — place together`)
      } else {
        total += 2
        reasons.push(`Sibling request: ${sib.first_name} ${sib.last_name} in same age group — place on same team`)
      }
    }
    // Cross-age case handled in recommend()
  }

  // ── +1 same school ───────────────────────────────────────────────────────────
  const teamPlayers = allPlayers.filter(p => p.player_id !== player.player_id && p.prev_team === team.team_name)

  const playerSchool = player.extraction_school?.trim()
    ? norm(player.extraction_school)
    : player.school_and_grade?.length > 4
      ? norm(player.school_and_grade).split(/\s+/).filter(w => w.length > 4).join(' ')
      : null

  if (playerSchool) {
    const sameSchool = teamPlayers.filter(tp => {
      const tpSchool = tp.extraction_school?.trim()
        ? norm(tp.extraction_school)
        : norm(tp.school_and_grade || '')
      return tpSchool.length > 4 && (tpSchool.includes(playerSchool) || playerSchool.includes(tpSchool))
    })
    if (sameSchool.length > 0) {
      total += 1
      const guessLabel = player.extraction_school_guessed ? ` (Augur guess)` : ''
      reasons.push(`Same school${guessLabel} as ${sameSchool.length} teammate(s)`)
    }
  }

  // ── +1 proximity (within 5 km / ~3 miles of 2+ teammates) ───────────────────
  if (player.lat != null && player.lng != null) {
    const nearbyTeammates = teamPlayers.filter(tp =>
      tp.lat != null && tp.lng != null &&
      haversineKm(player.lat!, player.lng!, tp.lat!, tp.lng!) <= 5
    )
    if (nearbyTeammates.length >= 2) {
      total += 1
      reasons.push(`Lives near ${nearbyTeammates.length} teammate(s) on this team`)
    }
  }

  // ── +1/+2 home proximity to practice field ────────────────────────────────────
  // Primary location signal for new players with no team/coach history.
  // Compares player home lat/lng to the team's practice field coordinates.
  if (team.practice_field && player.lat != null && player.lng != null) {
    const fieldCoords = FIELD_COORDS[team.practice_field]
    if (fieldCoords) {
      const distKm = haversineKm(player.lat, player.lng, fieldCoords.lat, fieldCoords.lng)
      if (distKm <= 3) {
        total += 2
        reasons.push(`Lives close to ${team.practice_field} (${distKm.toFixed(1)} km)`)
      } else if (distKm <= 8) {
        total += 1
        reasons.push(`Lives near ${team.practice_field} (${distKm.toFixed(1)} km)`)
      }
    }
  }

  // ── +1/+2 school proximity to practice field ───────────────────────────────────
  // If the AI stored school coordinates, check how close the school is to the practice field.
  // Encourages placing players near schoolmates on local teams.
  if (team.practice_field && player.extraction_school_lat != null && player.extraction_school_lng != null) {
    const fieldCoords = FIELD_COORDS[team.practice_field]
    if (fieldCoords) {
      const distKm = haversineKm(player.extraction_school_lat, player.extraction_school_lng, fieldCoords.lat, fieldCoords.lng)
      const schoolLabel = player.extraction_school_guessed
        ? `(Augur) ${player.extraction_school ?? 'guessed school'}`
        : (player.extraction_school ?? 'school')
      if (distKm <= 3) {
        total += 2
        reasons.push(`School near ${team.practice_field} (${distKm.toFixed(1)} km) — ${schoolLabel}`)
      } else if (distKm <= 6) {
        total += 1
        reasons.push(`School within range of ${team.practice_field} (${distKm.toFixed(1)} km) — ${schoolLabel}`)
      }
    }
  }

  // ── Roster capacity check (does NOT affect score, only adds a reason label) ──
  const currentCount = teamRosterCount.get(team.team_name) ?? 0
  const { preferred, max } = teamCapacity(team.birth_year, seasonYear)
  if (currentCount >= max) {
    reasons.push(`ROSTER FULL: ${currentCount}/${max} players (hard max per EGS rules)`)
  } else if (currentCount >= preferred) {
    reasons.push(`Roster near limit: ${currentCount}/${preferred} preferred (${max} max allowed)`)
  }

  return { team: team.team_name, score: total, reasons }
}

function getSuggestions(
  player: MatchPlayer,
  teams: MatchTeam[],
  allPlayers: MatchPlayer[],
  prevTeams: MatchTeam[],
  teamRosterCount: Map<string, number>,
  seasonYear: number,
): Suggestion[] {
  // ONLY score against current season teams — never previous year teams.
  // Previous team history is used as a scoring SIGNAL, not a candidate.
  const scored = teams
    .map(t => score(player, t, allPlayers, prevTeams, teamRosterCount, seasonYear))
    .sort((a, b) => b.score - a.score)

  const withSignals = scored.filter(s => s.score > 0)
  if (withSignals.length > 0) return withSignals.slice(0, 3)

  // No signals — new player with no history, no request, no location data.
  // Return first 3 teams alphabetically so the coordinator has something to work with.
  const alphabetical = [...scored].sort((a, b) => a.team.localeCompare(b.team)).slice(0, 3)
  return alphabetical.map(s => ({
    ...s,
    reasons: ['No prior data — assign based on availability'],
  }))
}

// ─── AI recommendation ─────────────────────────────────────────────────────────

function withNotes(rec: Recommendation, notes: string | undefined): Recommendation {
  if (!notes?.trim()) return rec
  return { ...rec, text: `${rec.text} — Note: ${notes.trim()}` }
}

function recommend(player: MatchPlayer, suggestions: Suggestion[], allPlayers: MatchPlayer[]): Recommendation {
  const req = (player.special_request || '').trim()
  const hasReq = req && !['n/a', 'na', 'none', '-'].includes(req.toLowerCase())
  const top = suggestions[0]
  const isNew = (player.new_or_returning || '').toLowerCase().includes('new')
  const augurSchoolNote = player.extraction_school_guessed && player.extraction_school
    ? `Augur guessed school as "${player.extraction_school}" based on address distance — coordinator should verify`
    : undefined
  const notes = [player.extraction_notes, augurSchoolNote].filter(Boolean).join(' | ') || undefined

  // Sibling cross-age check — runs whether or not there are suggestions
  // Use AI-extracted siblings[] when available, fall back to regex
  const aiRan = Array.isArray(player.extraction_coaches)
  const siblingNames: string[] = aiRan
    ? (player.extraction_siblings ?? [])
    : (() => { const r = detectSiblingRequest(req); return r ? [r.name] : [] })()

  for (const sibName of siblingNames) {
    const sib = findSibling(sibName, player.player_id, allPlayers)
    if (sib && sib.package_name !== player.package_name) {
      return {
        level: 'red',
        text: `Sibling request: ${sib.first_name} ${sib.last_name} is registered in ${sib.package_name} (different age group). One player must PLAY UP to be on the same team — only play-ups are allowed, no play-downs. Coordinator must decide which player moves up.`,
      }
    }
  }

  // Keep legacy sibReq for fallback recommendation text below
  const sibReq = detectSiblingRequest(req)

  const w = (rec: Recommendation) => withNotes(rec, notes)

  if (!suggestions.length) {
    if (siblingNames.length > 0) {
      const sib = findSibling(siblingNames[0], player.player_id, allPlayers)
      if (sib) {
        return w({ level: 'yellow', text: `Sibling request for ${sib.first_name} ${sib.last_name} — same age group, but no team anchor found yet. Assign both to the same team when placing.` })
      }
      return w({ level: 'yellow', text: `Sibling request for "${siblingNames[0]}" — player not found in current season registrations. Coordinator should verify.` })
    }
    if (isNew && !hasReq)
      return w({ level: 'orange', text: 'New player with no request — assign based on school/zip or coordinator preference.' })
    if (hasReq)
      return w({ level: 'red', text: `Request "${req}" could not be matched to a known team or coach. Manual lookup required.` })
    return w({ level: 'orange', text: 'No match found. Place manually based on availability.' })
  }

  const reasons = top.reasons
  const hasPlayingUp = reasons.some(r => r.includes('Playing up'))
  const hasPrevTeam = reasons.some(r => r.includes('Returning'))
  const hasCoachReq = reasons.some(r => r.includes('Requested coach'))
  const hasTeamReq = reasons.some(r => r.includes('Requested team'))
  const hasMutual = reasons.some(r => r.includes('Mutual friend'))
  const hasOneway = reasons.some(r => r.includes('One-way friend'))
  const hasSiblingEmail = reasons.some(r => r === 'Sibling on this team')
  const hasSiblingNamedTogether = reasons.some(r => r.includes('place together'))
  const hasSiblingNamedSameAge = reasons.some(r => r.includes('same age group'))
  const hasSchool = reasons.some(r => r.includes('school'))
  const hasProximity = reasons.some(r => r.includes('Lives near'))
  const rosterFull = reasons.some(r => r.includes('ROSTER FULL'))
  const rosterNearLimit = reasons.some(r => r.includes('Roster near limit'))

  // ── Capacity warnings — always surface before any other recommendation ────────
  if (rosterFull) {
    // Still show the best match, but escalate to red and force coordinator decision
    const baseText = top.score >= 3
      ? `Best match is ${top.team} (score ${top.score}) but`
      : `Suggested team ${top.team} but`
    return w({ level: 'red', text: `${baseText} this team is FULL — adding this player exceeds the hard max per EGS rules. Coordinator must approve override or assign to a different team.` })
  }

  if (rosterNearLimit) {
    // Downgrade any green to yellow, flag the capacity concern in the text
    const capReason = reasons.find(r => r.includes('Roster near limit')) ?? ''
    const capDetail = capReason.match(/\d+\/\d+ preferred \((\d+) max\)/)
    const maxNote = capDetail ? ` (hard max: ${capDetail[1]})` : ''
    // Let the normal recommendation logic run, but append a capacity note
    const capacityNote = `⚠️ Augur: ${capReason}${maxNote} — coordinator may place 1-2 over preferred per rules`
    const normalNotes = notes ? `${notes} | ${capacityNote}` : capacityNote
    // Re-wrap with combined notes for this branch
    const wCap = (rec: Recommendation) => withNotes(rec, normalNotes)
    // Downgrade green → yellow if near limit
    if (hasPlayingUp) return wCap({ level: 'yellow', text: `Previously on ${top.team} but age group differs — coordinator verify if playing up again.` })
    if (hasPrevTeam && hasReq && !hasCoachReq && !hasTeamReq && !hasSiblingNamedTogether && !hasSiblingNamedSameAge)
      return wCap({ level: 'yellow', text: `Was on ${player.prev_team} last year but has a new request ("${req}"). Confirm with family before reassigning.` })
    if (hasSiblingNamedTogether) return wCap({ level: 'yellow', text: `Assign to ${top.team}. Sibling request — both players were on this team, but roster is near limit.` })
    if (hasSiblingNamedSameAge) return wCap({ level: 'yellow', text: `Assign to ${top.team}. Sibling request in same age group — roster is near limit, coordinator should confirm.` })
    if (top.score >= 4) return wCap({ level: 'yellow', text: `Suggest ${top.team} (score ${top.score}) — strong match but roster is near preferred limit.` })
    return wCap({ level: 'orange', text: `Consider ${top.team} (score ${top.score}) — roster is near limit, may want to find an alternate team.` })
  }

  if (hasPlayingUp)
    return w({ level: 'yellow', text: `Previously on ${top.team} but age group differs — coordinator verify if playing up again.` })

  if (hasPrevTeam && hasReq && !hasCoachReq && !hasTeamReq && !hasSiblingNamedTogether && !hasSiblingNamedSameAge)
    return w({ level: 'yellow', text: `Was on ${player.prev_team} last year but has a new request ("${req}"). Confirm with family before reassigning.` })

  if (hasSiblingNamedTogether)
    return w({ level: 'green', text: `Assign to ${top.team}. Sibling request — both players were on this team. Keep together.` })

  if (hasSiblingNamedSameAge)
    return w({ level: 'green', text: `Assign to ${top.team}. Sibling request in same age group — place on same team.` })

  if (top.score >= 6 && hasPrevTeam && (hasCoachReq || hasTeamReq))
    return w({ level: 'green', text: `Assign to ${top.team}. Returning player who also requested this coach/team — strong alignment.` })

  if (top.score >= 5 && hasPrevTeam && !hasReq)
    return w({ level: 'green', text: `Return to ${top.team}. Same team as last year, no change requested.` })

  if (top.score >= 5 && (hasCoachReq || hasTeamReq))
    return w({ level: 'green', text: `Assign to ${top.team}. Player explicitly requested this ${hasCoachReq ? 'coach' : 'team'}.` })

  if (top.score >= 5 && hasMutual) {
    const mutualCount = reasons.filter(r => r.includes('Mutual')).length
    return w({ level: 'green', text: `Place on ${top.team}. Part of a mutual friend group (${mutualCount} mutual request${mutualCount > 1 ? 's' : ''}).` })
  }

  if (hasSiblingEmail)
    return w({ level: 'green', text: `Assign to ${top.team}. Sibling already on this team — keep family together.` })

  if (top.score >= 3 && (hasOneway || hasSchool || hasProximity)) {
    const details = [hasOneway && 'friend request', hasSchool && 'shared school', hasProximity && 'proximity'].filter(Boolean).join(' + ')
    return w({ level: 'yellow', text: `Consider ${top.team} based on ${details}. Score ${top.score}/10 — verify with coordinator.` })
  }

  if (isNew && hasReq && (hasCoachReq || hasTeamReq))
    return w({ level: 'green', text: `New player — assign to ${top.team} per their request.` })

  if (isNew)
    return w({ level: 'yellow', text: `New player. Best available match is ${top.team} (score ${top.score}/10). Coordinator should confirm.` })

  if (top.score <= 2)
    return w({ level: 'orange', text: `Weak signals only (score ${top.score}/10). Best guess: ${top.team}. Recommend coordinator review.` })

  return w({ level: 'yellow', text: `Suggest ${top.team} (score ${top.score}/10). Review reasons before confirming.` })
}

// ─── Cross-age school fallback ─────────────────────────────────────────────────
// When no eligible teams exist for a player's birth year/gender, look at same-
// gender players from the same school (within ±2 birth years) and find which
// current-season teams their schoolmates are on. Ranked by schoolmate count.

function getCrossAgeSuggestions(
  player: MatchPlayer,
  allPlayersAllPkgs: MatchPlayer[],
  currentTeams: MatchTeam[],
): { suggestions: Suggestion[]; schoolName: string } {
  const school = player.extraction_school?.trim()
  if (!school) return { suggestions: [], schoolName: '' }

  const schoolLower = school.toLowerCase()
  const playerBirthYear = parseInt(player.birth_date?.slice(0, 4) ?? '0')
  const playerGender = player.gender?.toLowerCase() // 'M' or 'F'

  // Find same-gender schoolmates within ±2 birth years who have a prev_team
  // that maps to an actual 2026 current-season team
  const currentTeamNames = new Set(currentTeams.map(t => t.team_name))

  // Fuzzy school match: either name contains the other (handles "Albiani" vs "Albiani Middle School")
  function schoolMatches(a: string, b: string): boolean {
    const al = a.toLowerCase(), bl = b.toLowerCase()
    return al === bl || al.includes(bl) || bl.includes(al)
  }

  const schoolMates = allPlayersAllPkgs.filter(p => {
    if (p.player_id === player.player_id) return false
    if (!p.extraction_school?.trim()) return false
    if (!schoolMatches(p.extraction_school.trim(), school)) return false
    if (!p.prev_team) return false
    // Same gender
    if (p.gender?.toLowerCase() !== playerGender) return false
    // Within ±2 birth years
    const by = parseInt(p.birth_date?.slice(0, 4) ?? '0')
    if (!by || !playerBirthYear) return false
    if (Math.abs(by - playerBirthYear) > 2) return false
    return true
  })

  // Count schoolmates per prev_team — prefer teams that exist in 2026 but include all
  const teamCounts = new Map<string, number>()
  for (const sm of schoolMates) {
    if (sm.prev_team) {
      teamCounts.set(sm.prev_team, (teamCounts.get(sm.prev_team) ?? 0) + 1)
    }
  }

  // Sort: 2026 teams first, then others, within each group by count descending
  const ranked2026 = [...teamCounts.entries()].filter(([t]) => currentTeamNames.has(t)).sort((a, b) => b[1] - a[1])
  const rankedOther = [...teamCounts.entries()].filter(([t]) => !currentTeamNames.has(t)).sort((a, b) => b[1] - a[1])
  const ranked = [...ranked2026, ...rankedOther].slice(0, 3)

  const genderLabel = playerGender === 'f' ? 'girls' : 'boys'
  const suggestions: Suggestion[] = ranked.map(([team, count]) => ({
    team,
    score: count,
    reasons: [`${count} ${school} ${genderLabel} (similar age) on this team`],
  }))

  return { suggestions, schoolName: school }
}

function recommendNoTeams(
  player: MatchPlayer,
  crossSugg: Suggestion[],
  schoolName: string,
  pkg: string,
): Recommendation {
  const req = (player.special_request || '').trim()
  const hasReq = req && !['n/a', 'na', 'none', '-'].includes(req.toLowerCase())
  const reqNote = hasReq ? ` Player requested "${req}".` : ''

  if (crossSugg.length > 0) {
    const teamList = crossSugg
      .map(s => `${s.team} (${s.score} ${schoolName} student${s.score > 1 ? 's' : ''})`)
      .join(', ')
    return {
      level: 'orange',
      text: `No ${pkg} teams found for 2026.${reqNote} Other ${schoolName} students are on: ${teamList} — coordinate placement with those coaches or add a ${pkg} team.`,
    }
  }

  return {
    level: 'red',
    text: `No ${pkg} teams found for 2026.${reqNote} Coordinator must manually place or add a team for this age group.`,
  }
}

// ─── main entry point ───────────────────────────────────────────────────────────

export async function runScoring(season: string): Promise<PackageResult[]> {
  const { packages, playersByPackage, currentTeams, prevTeams, seasonYear, teamRosterCount } =
    await loadMatchingData(season)

  // Build a flat list of all players across all packages for cross-age school lookups
  const allPlayersAllPkgs: MatchPlayer[] = []
  for (const pkgPlayers of playersByPackage.values()) {
    allPlayersAllPkgs.push(...pkgPlayers)
  }

  const results: PackageResult[] = []

  for (const pkg of packages) {
    const players = playersByPackage.get(pkg) ?? []
    const teams = getTeamsForPackage(pkg, currentTeams, seasonYear)

    const scoredPlayers: ScoredPlayer[] = players
      .map(player => {
        // No eligible teams for this birth year/gender — use cross-age school fallback
        if (teams.length === 0) {
          const { suggestions: crossSugg, schoolName } = getCrossAgeSuggestions(player, allPlayersAllPkgs, currentTeams)
          return { player, suggestions: crossSugg, recommendation: recommendNoTeams(player, crossSugg, schoolName, pkg) }
        }
        const suggestions = getSuggestions(player, teams, players, prevTeams, teamRosterCount, seasonYear)
        const recommendation = recommend(player, suggestions, players)
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
