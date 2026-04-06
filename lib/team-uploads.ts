import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from './dynamo'

const TEAMS_TABLE = 'egs-teams'
const ASSIGNMENTS_TABLE = 'egs-assignments'

export interface TeamRecord {
  team_id: string
  team_name: string
  season: string
  birth_year: string
  gender: string
  coach_last_name: string
}

export interface AssignmentRecord {
  player_id: string
  season: string
  assignment_id: string
  assignment_name: string
  assignment_status: string
  player_first_name: string
  player_last_name: string
  gender: string
  birth_date: string
  account_email: string
  account_phone: string
  team_id: string
  team_name: string
  tryout_note: string
}

/**
 * Parse a team name like "2017B Cougars (Flores)" into components.
 * Format: <birth_year><gender_code> <mascot> (<coach_last_name>)
 */
export function parseTeamName(teamName: string): {
  birth_year: string
  gender: string
  coach_last_name: string
} {
  const match = teamName.match(/^(\d{4})([BG])\s+.+\(([^)]+)\)/)
  if (match) {
    return {
      birth_year: match[1],
      gender: match[2] === 'B' ? 'Male' : 'Female',
      coach_last_name: match[3].trim(),
    }
  }
  return { birth_year: '', gender: '', coach_last_name: '' }
}

/** Normalize season string — "2025 Fall Recreation" → "2025" */
export function normalizeSeasonYear(season: string): string {
  const m = season.match(/^(\d{4})/)
  return m ? m[1] : season
}

export function csvRowToAssignment(
  row: Record<string, string>,
): AssignmentRecord {
  const rawSeason = row['season']?.trim() ?? ''
  const season = normalizeSeasonYear(rawSeason)
  return {
    player_id: row['player_id']?.trim() ?? '',
    season,
    assignment_id: row['assignment_id']?.trim() ?? '',
    assignment_name: row['assignment_name']?.trim() ?? '',
    assignment_status: row['assignment_status']?.trim() ?? '',
    player_first_name: row['player_first_name']?.trim() ?? '',
    player_last_name: row['player_last_name']?.trim() ?? '',
    gender: row['gender']?.trim() ?? '',
    birth_date: row['birth_date']?.trim() ?? '',
    account_email: row['account_email']?.trim() ?? '',
    account_phone: (row['account_mobile_number'] ?? row['account_phone'] ?? '').trim(),
    team_id: row['team_id']?.trim() ?? '',
    team_name: row['team']?.trim() ?? '',
    tryout_note: row['tryout_note']?.trim() ?? '',
  }
}

export function extractTeams(assignments: AssignmentRecord[]): TeamRecord[] {
  const seen = new Set<string>()
  const teams: TeamRecord[] = []

  for (const a of assignments) {
    if (!a.team_id || seen.has(a.team_id)) continue
    seen.add(a.team_id)
    const { birth_year, gender, coach_last_name } = parseTeamName(a.team_name)
    teams.push({
      team_id: a.team_id,
      team_name: a.team_name,
      season: a.season,
      birth_year,
      gender,
      coach_last_name,
    })
  }

  return teams
}

async function batchWrite(
  tableName: string,
  items: Record<string, unknown>[],
): Promise<void> {
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map(item => ({ PutRequest: { Item: item } })),
        },
      }),
    )
  }
}

export async function getExistingAssignmentKeys(
  season: string,
): Promise<Set<string>> {
  const keys = new Set<string>()
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(
      new ScanCommand({
        TableName: ASSIGNMENTS_TABLE,
        FilterExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': season },
        ProjectionExpression: 'player_id',
        ExclusiveStartKey: lastKey,
      }),
    )
    for (const item of res.Items ?? []) {
      keys.add(item.player_id as string)
    }
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return keys
}

export async function insertTeamsAndAssignments(
  assignments: AssignmentRecord[],
): Promise<{ teamsUpserted: number; upserted: number; unassigned: number }> {
  // Only process "Rostered" players
  const rostered = assignments.filter(
    a => a.assignment_status.toLowerCase() === 'rostered' && a.player_id,
  )
  const unassigned = assignments.filter(
    a => a.assignment_status.toLowerCase() !== 'rostered',
  ).length

  // Deduplicate by player_id — a player may appear multiple times in the CSV
  const rosteredMap = new Map<string, AssignmentRecord>()
  for (const a of rostered) {
    rosteredMap.set(a.player_id, a)
  }
  const dedupedRostered = Array.from(rosteredMap.values())

  // Upsert all teams (idempotent — same team_id will just overwrite)
  const teams = extractTeams(assignments)
  if (teams.length > 0) {
    await batchWrite(TEAMS_TABLE, teams as unknown as Record<string, unknown>[])
  }

  // Upsert all rostered assignments — re-uploads update existing records in place
  if (dedupedRostered.length > 0) {
    await batchWrite(
      ASSIGNMENTS_TABLE,
      dedupedRostered as unknown as Record<string, unknown>[],
    )
  }

  return {
    teamsUpserted: teams.length,
    upserted: dedupedRostered.length,
    unassigned,
  }
}
