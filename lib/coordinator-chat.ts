/**
 * Coordinator Chat — Claude Haiku with tool use for admin matching queries.
 *
 * Tools read live data from DynamoDB. Write operations (assign_player)
 * return a confirmation prompt — the frontend must confirm before the
 * write actually executes.
 */

import Anthropic from '@anthropic-ai/sdk'
import { loadMatchingData, score, getTeamsForPackage, teamCapacity } from './matching-engine'
import type { MatchPlayer, MatchTeam } from './matching-engine'
import { loadReport } from './grand-assignment'
import { db } from './dynamo'
import { PutCommand } from '@aws-sdk/lib-dynamodb'

const SEASON = '2026'

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const tools: Anthropic.Tool[] = [
  {
    name: 'list_players',
    description: 'Search for players by name, school, package/age group, city, or any combination. Returns matching player details including school, city, special request, previous team, and extraction data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Player name (first, last, or full) to search for. Case-insensitive partial match.' },
        school: { type: 'string', description: 'School name to filter by. Case-insensitive partial match.' },
        package_name: { type: 'string', description: 'Package/age group like "2017 Boys" or "U10 Girls"' },
        city: { type: 'string', description: 'City name to filter by' },
      },
      required: [],
    },
  },
  {
    name: 'list_teams',
    description: 'List all teams for the 2026 season. Can filter by birth year, gender, or partial team name. Returns team name, coach, birth year, gender, practice field, and roster capacity.',
    input_schema: {
      type: 'object' as const,
      properties: {
        birth_year: { type: 'string', description: 'Filter by birth year (e.g. "2017", "2015")' },
        gender: { type: 'string', description: 'Filter by gender: "Boys" or "Girls" (or "B"/"G", "Male"/"Female")' },
        name: { type: 'string', description: 'Partial team name search (e.g. "Destroyers", "Firehawks")' },
      },
      required: [],
    },
  },
  {
    name: 'get_team_roster',
    description: 'Get a team roster showing the team name, coach, how many players are assigned, capacity limits, and the list of assigned players. Can search by team name or team ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        team_name: { type: 'string', description: 'Team name or partial name to search for (e.g. "Destroyers", "2017B Firehawks")' },
      },
      required: ['team_name'],
    },
  },
  {
    name: 'assign_player',
    description: 'Assign a player to a team. This is a WRITE operation — always confirm with the coordinator before calling this. Returns the assignment result with audit trail.',
    input_schema: {
      type: 'object' as const,
      properties: {
        player_id: { type: 'string', description: 'The player_id to assign' },
        team_id: { type: 'string', description: 'The team_id to assign to' },
        team_name: { type: 'string', description: 'The team name (for display/audit)' },
        reason: { type: 'string', description: 'Why this assignment is being made (from coordinator message)' },
      },
      required: ['player_id', 'team_id', 'team_name', 'reason'],
    },
  },
  {
    name: 'get_report',
    description: 'Get the grand assignment report summary — total assigned, unassigned, confidence breakdown, and team fill levels.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'explain_score',
    description: 'Explain why a specific player scored the way they did against a specific team. Shows the full signal breakdown.',
    input_schema: {
      type: 'object' as const,
      properties: {
        player_name: { type: 'string', description: 'Player name to look up' },
        team_name: { type: 'string', description: 'Team name to score against' },
      },
      required: ['player_name', 'team_name'],
    },
  },
]

// ─── Tool execution ───────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'list_players': return await listPlayers(input)
    case 'list_teams': return await listTeams(input)
    case 'get_team_roster': return await getTeamRoster(input)
    case 'assign_player': return await assignPlayer(input)
    case 'get_report': return await getReport()
    case 'explain_score': return await explainScore(input)
    default: return `Unknown tool: ${name}`
  }
}

async function listPlayers(input: Record<string, unknown>): Promise<string> {
  const { playersByPackage, currentTeams, seasonYear } = await loadMatchingData(SEASON)

  const allPlayers: MatchPlayer[] = []
  for (const players of playersByPackage.values()) {
    allPlayers.push(...players)
  }

  let results = allPlayers

  if (input.name) {
    const q = String(input.name).toLowerCase()
    results = results.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q)
    )
  }

  if (input.school) {
    const q = String(input.school).toLowerCase()
    results = results.filter(p =>
      (p.extraction_school?.toLowerCase().includes(q)) ||
      (p.school_and_grade?.toLowerCase().includes(q))
    )
  }

  if (input.package_name) {
    const q = String(input.package_name).toLowerCase()
    results = results.filter(p => p.package_name.toLowerCase().includes(q))
  }

  if (input.city) {
    const q = String(input.city).toLowerCase()
    results = results.filter(p => p.city?.toLowerCase().includes(q))
  }

  if (results.length === 0) return 'No players found matching that criteria.'
  if (results.length > 30) return `Found ${results.length} players — please narrow your search (add name, school, or package filter).`

  return results.map(p => {
    const parts = [
      `**${p.first_name} ${p.last_name}** (ID: ${p.player_id})`,
      `Package: ${p.package_name}`,
      p.extraction_school ? `School: ${p.extraction_school}${p.extraction_school_guessed ? ' (Augur🧠 guess)' : ''}` : null,
      p.city ? `City: ${p.city}` : null,
      p.prev_team ? `Prev team: ${p.prev_team}` : 'New player',
      p.special_request && !['n/a', 'na', 'none', '-', ''].includes(p.special_request.toLowerCase().trim())
        ? `Request: "${p.special_request}"`
        : null,
    ].filter(Boolean).join(' | ')
    return parts
  }).join('\n')
}

async function listTeams(input: Record<string, unknown>): Promise<string> {
  const { currentTeams, seasonYear, teamRosterCount } = await loadMatchingData(SEASON)

  let results = currentTeams

  if (input.birth_year) {
    const q = String(input.birth_year)
    results = results.filter(t => t.birth_year === q)
  }

  if (input.gender) {
    const g = String(input.gender).toLowerCase()
    results = results.filter(t => {
      const tg = t.gender.toLowerCase()
      return tg === g || tg.startsWith(g.charAt(0)) ||
        (g.includes('boy') && (tg === 'male' || tg === 'b')) ||
        (g.includes('girl') && (tg === 'female' || tg === 'g'))
    })
  }

  if (input.name) {
    const q = String(input.name).toLowerCase()
    results = results.filter(t => t.team_name.toLowerCase().includes(q))
  }

  if (results.length === 0) return 'No teams found matching that criteria.'

  return results
    .sort((a, b) => a.team_name.localeCompare(b.team_name))
    .map(t => {
      const { preferred, max } = teamCapacity(t.birth_year, seasonYear)
      const count = teamRosterCount.get(t.team_name) ?? 0
      return `**${t.team_name}** | Coach: ${t.coach_last_name} | Field: ${t.practice_field ?? 'Not set'} | Roster: ${count}/${preferred} (max ${max})`
    }).join('\n')
}

async function getTeamRoster(input: Record<string, unknown>): Promise<string> {
  const { currentTeams, seasonYear, teamRosterCount } = await loadMatchingData(SEASON)
  const report = await loadReport(SEASON)

  const q = String(input.team_name).toLowerCase()
  const matchedTeams = currentTeams.filter(t => t.team_name.toLowerCase().includes(q))

  if (matchedTeams.length === 0) return `No team found matching "${input.team_name}".`

  return matchedTeams.map(t => {
    const { preferred, max } = teamCapacity(t.birth_year, seasonYear)
    const rosterCount = teamRosterCount.get(t.team_name) ?? 0
    const assignedPlayers = report?.assignments.filter(a => a.assigned_team_name === t.team_name) ?? []

    const lines = [
      `**${t.team_name}**`,
      `Coach: ${t.coach_last_name} | Birth year: ${t.birth_year} | Gender: ${t.gender}`,
      `Practice field: ${t.practice_field ?? 'Not set'}`,
      `Roster: ${rosterCount} rostered + ${assignedPlayers.length} grand-assigned = ${rosterCount + assignedPlayers.length} total`,
      `Capacity: ${preferred} preferred / ${max} max`,
      '',
    ]

    if (assignedPlayers.length > 0) {
      lines.push('Grand-assigned players:')
      for (const a of assignedPlayers) {
        const conf = a.confidence === 'green' ? '🟢' : a.confidence === 'yellow' ? '🟡' : '🔴'
        lines.push(`  ${conf} ${a.player_name} (score ${a.score})`)
      }
    } else {
      lines.push('No players assigned via grand assignment yet.')
    }

    return lines.join('\n')
  }).join('\n\n---\n\n')
}

async function assignPlayer(input: Record<string, unknown>): Promise<string> {
  const playerId = String(input.player_id)
  const teamId = String(input.team_id)
  const teamName = String(input.team_name)
  const reason = String(input.reason)
  const now = new Date().toISOString()

  try {
    await db.send(new PutCommand({
      TableName: 'egs-grand-assignments',
      Item: {
        player_id: playerId,
        season: SEASON,
        player_name: '', // filled below
        package_name: '',
        assigned_team_id: teamId,
        assigned_team_name: teamName,
        score: 0,
        signals: [`Coordinator chat: ${reason}`],
        confidence: 'green',
        assigned_by: 'coordinator_override',
        override_approved: true,
        timestamp: now,
      },
    }))

    return `Assigned player ${playerId} to ${teamName}. Reason: ${reason}. Timestamp: ${now}. assigned_by: coordinator_chat.`
  } catch (e) {
    return `Failed to assign: ${e instanceof Error ? e.message : String(e)}`
  }
}

async function getReport(): Promise<string> {
  const report = await loadReport(SEASON)
  if (!report) return 'No grand assignment report found. Run the grand assignment first from /admin/assignments.'

  const lines = [
    `**Grand Assignment Report — ${SEASON}**`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    '',
    `Total players: ${report.stats.total_players}`,
    `Assigned: ${report.stats.assigned} | Unassigned: ${report.stats.unassigned}`,
    `🟢 Strong: ${report.stats.green} | 🟡 Moderate: ${report.stats.yellow} | 🔴 Weak: ${report.stats.red}`,
    '',
  ]

  if (report.unassigned.length > 0) {
    lines.push(`**Unassigned players (${report.unassigned.length}):**`)
    for (const u of report.unassigned.slice(0, 15)) {
      lines.push(`  - ${u.player_name} (${u.package_name}): ${u.reason}`)
    }
    if (report.unassigned.length > 15) {
      lines.push(`  ... and ${report.unassigned.length - 15} more`)
    }
  }

  const fullTeams = report.teamSummary.filter(t => t.assigned_count >= t.max)
  if (fullTeams.length > 0) {
    lines.push('', `**Full teams (${fullTeams.length}):**`)
    for (const t of fullTeams) {
      lines.push(`  - ${t.team_name}: ${t.assigned_count}/${t.max}`)
    }
  }

  return lines.join('\n')
}

async function explainScore(input: Record<string, unknown>): Promise<string> {
  const { playersByPackage, currentTeams, prevTeams, seasonYear, teamRosterCount } = await loadMatchingData(SEASON)

  const allPlayers: MatchPlayer[] = []
  for (const players of playersByPackage.values()) {
    allPlayers.push(...players)
  }

  const pName = String(input.player_name).toLowerCase()
  const player = allPlayers.find(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(pName)
  )
  if (!player) return `Player "${input.player_name}" not found.`

  const tName = String(input.team_name).toLowerCase()
  const team = currentTeams.find(t => t.team_name.toLowerCase().includes(tName))
  if (!team) return `Team "${input.team_name}" not found in 2026 teams.`

  const result = score(player, team, allPlayers, prevTeams, teamRosterCount, seasonYear)

  const lines = [
    `**${player.first_name} ${player.last_name}** vs **${team.team_name}**`,
    `Total score: ${result.score}`,
    '',
    'Signals:',
    ...result.reasons.map(r => `  - ${r}`),
    '',
    'Player context:',
    `  Package: ${player.package_name}`,
    player.extraction_school ? `  School: ${player.extraction_school}${player.extraction_school_guessed ? ' (Augur🧠 guess)' : ''}` : '  School: unknown',
    `  City: ${player.city || 'unknown'}`,
    player.prev_team ? `  Previous team: ${player.prev_team}` : '  New player',
    player.special_request ? `  Request: "${player.special_request}"` : '  No special request',
  ]

  return lines.join('\n')
}

// ─── System prompt ─────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are the Elk Grove Soccer coordinator assistant. You help coordinators manage player-to-team assignments for the Spring 2026 recreational soccer season.

You have access to live data from DynamoDB via tools. Use them to answer questions — never guess at player names, team rosters, or scores.

Key rules:
- ALWAYS use tools to look up data before answering. Do not make up player names, team names, or scores.
- For WRITE operations (assign_player), you MUST ask the coordinator to confirm before calling the tool. Show them what you're about to do and wait for "yes" or confirmation.
- Keep responses concise and direct — coordinators are busy.
- When listing players or teams, format results clearly with key details.
- If a search returns too many results, ask the coordinator to narrow it down.
- Refer to the matching confidence as: 🟢 Strong, 🟡 Moderate, 🔴 Weak (AI guess — verify).
- School guesses from Augur (the AI extraction system) are labeled "Augur🧠 guess" — flag these as needing verification.

You are scoped to the Spring 2026 season only.`
