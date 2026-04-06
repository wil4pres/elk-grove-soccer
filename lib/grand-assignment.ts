/**
 * Grand Assignment Engine — global constraint-aware team assignment.
 *
 * Unlike the per-player greedy approach in matching-engine.ts (which suggests
 * teams for each player independently), this engine:
 *   1. Scores EVERY player against EVERY eligible team
 *   2. Sorts ALL (player, team, score) tuples globally by score descending
 *   3. Greedily assigns — strongest signals first, skips full teams
 *   4. Classifies confidence: 🟢 strong | 🟡 moderate | 🔴 weak
 *   5. Stores results in DynamoDB egs-grand-assignments
 *
 * Roster overflow: first pass hard-caps at team max. Coordinator can approve
 * +2 per team via overrides; re-run reassigns displaced players.
 */

import { PutCommand, ScanCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { db } from './dynamo'
import {
  loadMatchingData,
  score,
  teamCapacity,
  getTeamsForPackage,
  type MatchPlayer,
  type MatchTeam,
  type Suggestion,
} from './matching-engine'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type Confidence = 'green' | 'yellow' | 'red'

export interface GrandAssignmentRow {
  player_id: string
  season: string
  player_name: string
  package_name: string
  assigned_team_id: string
  assigned_team_name: string
  score: number
  signals: string[]
  confidence: Confidence
  assigned_by: 'grand_assignment' | 'coordinator_override'
  override_approved?: boolean        // coordinator approved roster overflow
  timestamp: string
}

export interface GrandAssignmentReport {
  season: string
  assignments: GrandAssignmentRow[]
  unassigned: UnassignedRow[]
  teamSummary: TeamSummary[]
  stats: ReportStats
  generatedAt: string
}

export interface UnassignedRow {
  player_id: string
  player_name: string
  package_name: string
  reason: string
  best_team?: string
  best_score?: number
}

export interface TeamSummary {
  team_id: string
  team_name: string
  birth_year: string
  gender: string
  assigned_count: number
  preferred: number
  max: number
  overflow_approved: number  // how many +2 slots coordinator approved
}

export interface ReportStats {
  total_players: number
  assigned: number
  unassigned: number
  green: number
  yellow: number
  red: number
}

// ─── Confidence classification ─────────────────────────────────────────────────

function classifyConfidence(scoreVal: number, signals: string[]): Confidence {
  const hasExplicitRequest = signals.some(s =>
    s.includes('Requested coach') ||
    s.includes('Requested team') ||
    s.includes('Returning to same team') ||
    s.includes('Mutual friend') ||
    s.includes('Sibling') ||
    s.includes('place together')
  )

  // 🟢 Strong explicit signal — high confidence
  if (scoreVal >= 5 && hasExplicitRequest) return 'green'
  if (scoreVal >= 4 && signals.some(s => s.includes('Mutual friend'))) return 'green'
  if (signals.some(s => s.includes('Sibling on this team') || s.includes('place together'))) return 'green'
  if (scoreVal >= 6) return 'green'

  // 🟡 Moderate inference — reasonable but verify
  if (scoreVal >= 3) return 'yellow'
  if (signals.some(s =>
    s.includes('One-way friend') ||
    s.includes('school') ||
    s.includes('Lives near') ||
    s.includes('Lives close')
  )) return 'yellow'

  // 🔴 Weakest assumption — demographics/availability only
  return 'red'
}

// ─── Player context for zero-score assignments ────────────────────────────────
// When a player has no scoring signals, surface what data we DO have and
// explain what's missing so the coordinator knows what to do next.

function buildPlayerContext(player: MatchPlayer): string[] {
  const context: string[] = []
  const missing: string[] = []

  // What we know
  if (player.extraction_school) {
    const label = player.extraction_school_guessed
      ? `School: ${player.extraction_school} — Augur🤖 Best Guess`
      : `School: ${player.extraction_school}`
    context.push(label)
  } else if (player.school_and_grade && !['n/a', 'na', 'none', '-', ''].includes(player.school_and_grade.toLowerCase().trim())) {
    context.push(`School/grade: ${player.school_and_grade}`)
  } else {
    missing.push('school')
  }

  if (player.city) {
    context.push(`City: ${player.city}`)
  }

  if (player.lat != null && player.lng != null) {
    context.push('Geocoded (has address)')
  } else {
    missing.push('address/geocode')
  }

  if (player.prev_team) {
    context.push(`Prev team: ${player.prev_team}`)
  } else {
    context.push('New player — no team history')
  }

  const req = (player.special_request || '').trim()
  const hasReq = req && !['n/a', 'na', 'none', '-'].includes(req.toLowerCase())
  if (hasReq) {
    context.push(`Request: "${req}" (unmatched)`)
  } else {
    missing.push('special request')
  }

  // What needs to happen
  if (missing.length > 0) {
    context.push(`Missing: ${missing.join(', ')} — coordinator assign manually`)
  } else {
    context.push('Has data but no team match — coordinator verify placement')
  }

  return context
}

// ─── Grand Assignment Algorithm ────────────────────────────────────────────────

interface ScoredTuple {
  player: MatchPlayer
  team: MatchTeam
  score: number
  reasons: string[]
}

export async function runGrandAssignment(season: string): Promise<GrandAssignmentReport> {
  const {
    packages,
    playersByPackage,
    currentTeams,
    prevTeams,
    seasonYear,
    teamRosterCount,
  } = await loadMatchingData(season)

  // Load any existing coordinator overrides (approved +2 per team)
  const existingOverrides = await loadOverrides(season)
  const overrideMap = new Map<string, number>() // team_name → extra slots approved
  for (const o of existingOverrides) {
    overrideMap.set(o.assigned_team_name, (overrideMap.get(o.assigned_team_name) ?? 0) + 1)
  }

  // Build flat list of all players
  const allPlayers: MatchPlayer[] = []
  for (const pkgPlayers of playersByPackage.values()) {
    allPlayers.push(...pkgPlayers)
  }

  // ── Step 1: Score every player against every eligible team ──────────────────
  const allTuples: ScoredTuple[] = []

  for (const pkg of packages) {
    const players = playersByPackage.get(pkg) ?? []
    const teams = getTeamsForPackage(pkg, currentTeams, seasonYear)

    // If no teams for this package, score against same-gender teams (cross-age)
    const candidateTeams = teams.length > 0
      ? teams
      : currentTeams.filter(t => {
          const playerGender = players[0]?.gender
          return t.gender === playerGender ||
            (playerGender === 'F' && t.gender === 'Female') ||
            (playerGender === 'M' && t.gender === 'Male')
        })

    for (const player of players) {
      for (const team of candidateTeams) {
        const suggestion = score(player, team, allPlayers, prevTeams, teamRosterCount, seasonYear)
        allTuples.push({
          player,
          team,
          score: suggestion.score,
          reasons: suggestion.reasons,
        })
      }
    }
  }

  // ── Step 2: Sort globally by score descending ──────────────────────────────
  allTuples.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Tie-break: returning players get priority
    const aReturning = a.reasons.some(r => r.includes('Returning')) ? 1 : 0
    const bReturning = b.reasons.some(r => r.includes('Returning')) ? 1 : 0
    return bReturning - aReturning
  })

  // ── Step 3: Greedy assignment — strongest signals first ────────────────────
  const assignedPlayers = new Set<string>()   // player_id
  const teamCounts = new Map<string, number>() // team_name → assigned count

  // Initialize team counts from existing rostered assignments
  for (const [team, count] of teamRosterCount.entries()) {
    teamCounts.set(team, count)
  }

  const assignments: GrandAssignmentRow[] = []
  const now = new Date().toISOString()

  for (const tuple of allTuples) {
    if (assignedPlayers.has(tuple.player.player_id)) continue

    const currentCount = teamCounts.get(tuple.team.team_name) ?? 0
    const { max } = teamCapacity(tuple.team.birth_year, seasonYear)
    const extraSlots = overrideMap.get(tuple.team.team_name) ?? 0
    const effectiveMax = max + extraSlots

    // Skip if team is full (hard cap + any approved overflow)
    if (currentCount >= effectiveMax) continue

    // Filter out ROSTER FULL reasons since we're actually assigning
    let signals = tuple.reasons.filter(r =>
      !r.includes('ROSTER FULL') && !r.includes('Roster near limit') &&
      !r.includes('No prior data')
    )

    // For zero-score players, surface what we know and what's missing
    if (tuple.score === 0 || signals.length === 0) {
      signals = buildPlayerContext(tuple.player)
    }

    const confidence = classifyConfidence(tuple.score, signals)

    assignments.push({
      player_id: tuple.player.player_id,
      season,
      player_name: `${tuple.player.first_name} ${tuple.player.last_name}`,
      package_name: tuple.player.package_name,
      assigned_team_id: tuple.team.team_id,
      assigned_team_name: tuple.team.team_name,
      score: tuple.score,
      signals,
      confidence,
      assigned_by: 'grand_assignment',
      timestamp: now,
    })

    assignedPlayers.add(tuple.player.player_id)
    teamCounts.set(tuple.team.team_name, currentCount + 1)
  }

  // ── Step 4: Identify unassigned players ────────────────────────────────────
  const unassigned: UnassignedRow[] = []
  for (const player of allPlayers) {
    if (assignedPlayers.has(player.player_id)) continue

    // Find best tuple for this player to explain why they weren't assigned
    const playerTuples = allTuples
      .filter(t => t.player.player_id === player.player_id)
      .sort((a, b) => b.score - a.score)

    const best = playerTuples[0]
    const reason = best
      ? `Best match ${best.team.team_name} (score ${best.score}) is at capacity`
      : 'No eligible teams found for this age group/gender'

    unassigned.push({
      player_id: player.player_id,
      player_name: `${player.first_name} ${player.last_name}`,
      package_name: player.package_name,
      reason,
      best_team: best?.team.team_name,
      best_score: best?.score,
    })
  }

  // ── Step 5: Build team summary ─────────────────────────────────────────────
  const teamSummary: TeamSummary[] = currentTeams.map(t => {
    const { preferred, max } = teamCapacity(t.birth_year, seasonYear)
    return {
      team_id: t.team_id,
      team_name: t.team_name,
      birth_year: t.birth_year,
      gender: t.gender,
      assigned_count: teamCounts.get(t.team_name) ?? 0,
      preferred,
      max,
      overflow_approved: overrideMap.get(t.team_name) ?? 0,
    }
  }).sort((a, b) => a.team_name.localeCompare(b.team_name))

  // ── Step 6: Compute stats ──────────────────────────────────────────────────
  const stats: ReportStats = {
    total_players: allPlayers.length,
    assigned: assignments.length,
    unassigned: unassigned.length,
    green: assignments.filter(a => a.confidence === 'green').length,
    yellow: assignments.filter(a => a.confidence === 'yellow').length,
    red: assignments.filter(a => a.confidence === 'red').length,
  }

  const report: GrandAssignmentReport = {
    season,
    assignments,
    unassigned,
    teamSummary,
    stats,
    generatedAt: now,
  }

  // ── Step 7: Persist to DynamoDB ────────────────────────────────────────────
  await saveReport(report)

  return report
}

// ─── DynamoDB persistence ──────────────────────────────────────────────────────

const TABLE = 'egs-grand-assignments'

async function saveReport(report: GrandAssignmentReport): Promise<void> {
  // Write each assignment as a separate item (pk: player_id, sk: season)
  // Plus a metadata item for the report itself
  const writes = report.assignments.map(a =>
    db.send(new PutCommand({
      TableName: TABLE,
      Item: { ...a },
    }))
  )

  // Store report metadata
  writes.push(
    db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        player_id: '__report__',
        season: report.season,
        stats: report.stats,
        teamSummary: report.teamSummary,
        unassigned: report.unassigned,
        generatedAt: report.generatedAt,
      },
    }))
  )

  // Write in batches of 25 to avoid throttling
  for (let i = 0; i < writes.length; i += 25) {
    await Promise.all(writes.slice(i, i + 25))
  }
}

export async function loadReport(season: string): Promise<GrandAssignmentReport | null> {
  // Load all items for this season
  const items: Record<string, any>[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'season = :s',
      ExpressionAttributeValues: { ':s': season },
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) items.push(item as Record<string, any>)
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  if (items.length === 0) return null

  const meta = items.find(i => i.player_id === '__report__')
  const assignments = items
    .filter(i => i.player_id !== '__report__')
    .map(i => i as unknown as GrandAssignmentRow)

  return {
    season,
    assignments,
    unassigned: meta?.unassigned ?? [],
    teamSummary: meta?.teamSummary ?? [],
    stats: meta?.stats ?? { total_players: 0, assigned: 0, unassigned: 0, green: 0, yellow: 0, red: 0 },
    generatedAt: meta?.generatedAt ?? '',
  }
}

async function loadOverrides(season: string): Promise<GrandAssignmentRow[]> {
  const items: Record<string, any>[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'season = :s AND override_approved = :t',
      ExpressionAttributeValues: { ':s': season, ':t': true },
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) items.push(item as Record<string, any>)
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return items as unknown as GrandAssignmentRow[]
}

// ─── Coordinator actions ────────────────────────────────────────────────────────

/** Override a player's assignment (coordinator moves them to a different team) */
export async function overrideAssignment(
  playerId: string,
  season: string,
  newTeamId: string,
  newTeamName: string,
): Promise<GrandAssignmentRow> {
  const now = new Date().toISOString()

  const row: GrandAssignmentRow = {
    player_id: playerId,
    season,
    player_name: '', // will be filled from existing
    package_name: '',
    assigned_team_id: newTeamId,
    assigned_team_name: newTeamName,
    score: 0,
    signals: ['Coordinator override'],
    confidence: 'green',
    assigned_by: 'coordinator_override',
    timestamp: now,
  }

  // Try to preserve player name from existing assignment
  const existing = await loadReport(season)
  const existingRow = existing?.assignments.find(a => a.player_id === playerId)
  if (existingRow) {
    row.player_name = existingRow.player_name
    row.package_name = existingRow.package_name
  }

  await db.send(new PutCommand({ TableName: TABLE, Item: { ...row } }))
  return row
}

/** Approve roster overflow for a team (+2 max) */
export async function approveOverflow(
  playerId: string,
  season: string,
): Promise<void> {
  // Mark the assignment as overflow-approved
  const existing = await loadReport(season)
  const row = existing?.assignments.find(a => a.player_id === playerId)
    ?? existing?.unassigned.find(u => u.player_id === playerId)

  if (!row) throw new Error(`Player ${playerId} not found in report`)

  // For unassigned players, we need their best_team info
  const unassignedRow = existing?.unassigned.find(u => u.player_id === playerId)
  if (unassignedRow && unassignedRow.best_team) {
    const now = new Date().toISOString()
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        player_id: playerId,
        season,
        player_name: unassignedRow.player_name,
        package_name: unassignedRow.package_name,
        assigned_team_id: '',
        assigned_team_name: unassignedRow.best_team,
        score: unassignedRow.best_score ?? 0,
        signals: ['Coordinator approved overflow'],
        confidence: 'yellow' as Confidence,
        assigned_by: 'coordinator_override',
        override_approved: true,
        timestamp: now,
      },
    }))
  }
}

/** Clear all grand assignments for a season (before re-run) */
export async function clearAssignments(season: string): Promise<number> {
  const items: Record<string, any>[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'season = :s',
      ExpressionAttributeValues: { ':s': season },
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) items.push(item as Record<string, any>)
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  // Delete in batches
  for (let i = 0; i < items.length; i += 25) {
    await Promise.all(
      items.slice(i, i + 25).map(item =>
        db.send(new DeleteCommand({
          TableName: TABLE,
          Key: { player_id: item.player_id, season: item.season },
        }))
      )
    )
  }

  return items.length
}
