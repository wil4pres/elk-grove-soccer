/**
 * Populate practice_field on 2026 DynamoDB teams using SQLite historical data.
 *
 * Matches 2026 teams to historical teams by coach last name + birth year + gender.
 * Teams with no historical match are left without a practice_field (coordinators
 * can update them manually via the admin UI).
 *
 * Run:
 *   DYNAMO_ACCESS_KEY_ID=... DYNAMO_SECRET_ACCESS_KEY=... \
 *   npx tsx platform/dynamo/update-practice-fields-2026.ts
 *
 * Or from the project root (picks up .env.local):
 *   source .env.local && npx tsx platform/dynamo/update-practice-fields-2026.ts
 */

import Database from 'better-sqlite3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SQLITE_PATH = path.join(__dirname, '../../matching/matching.db')

const client = new DynamoDBClient({
  region: process.env.DYNAMO_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY!,
  },
})
const db = DynamoDBDocumentClient.from(client)
const TABLE = 'egs-teams'

// ─── Load historical practice fields from SQLite ──────────────────────────────
// Key: "BIRTHYEAR|GENDER|COACHLAST" → practice_field
const sqlite = new Database(SQLITE_PATH, { readonly: true })

interface SqliteTeam {
  name: string
  practice_field: string
}

const sqliteTeams = sqlite.prepare(`
  SELECT DISTINCT t.name, t.practice_field
  FROM teams t
  WHERE t.practice_field IS NOT NULL AND t.practice_field != ''
  ORDER BY t.name
`).all() as SqliteTeam[]

sqlite.close()

// Build lookup: birth_year + gender + coach_last → practice_field
function extractCoachLast(teamName: string): string {
  const m = teamName.match(/\(([^)]+)\)/)
  return m ? m[1].toLowerCase() : ''
}

function parseGender(teamName: string): string {
  if (/^\d{4}G\s/.test(teamName)) return 'Female'
  if (/^\d{4}B\s/.test(teamName)) return 'Male'
  return ''
}

function parseBirthYear(teamName: string): string {
  const m = teamName.match(/^(\d{4})[BG]/)
  return m ? m[1] : ''
}

const historicalLookup = new Map<string, string>()
for (const t of sqliteTeams) {
  const by = parseBirthYear(t.name)
  const gender = parseGender(t.name)
  const coach = extractCoachLast(t.name)
  if (by && gender && coach) {
    const key = `${by}|${gender}|${coach}`
    if (!historicalLookup.has(key)) {
      historicalLookup.set(key, t.practice_field)
    }
  }
}

console.log(`Loaded ${historicalLookup.size} historical field assignments from SQLite\n`)

// ─── Load 2026 teams from DynamoDB ───────────────────────────────────────────
const teams: Record<string, any>[] = []
let lastKey: Record<string, unknown> | undefined
do {
  const res = await db.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'season = :s',
    ExpressionAttributeValues: { ':s': '2026' },
    ExclusiveStartKey: lastKey,
  }))
  for (const item of res.Items ?? []) teams.push(item)
  lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
} while (lastKey)

console.log(`Loaded ${teams.length} 2026 teams from DynamoDB`)

// ─── Match and update ─────────────────────────────────────────────────────────
let updated = 0
let skipped = 0
let noMatch = 0

for (const team of teams) {
  // Skip teams that already have practice_field set
  if (team.practice_field) {
    skipped++
    continue
  }

  const by = team.birth_year ?? ''
  const gender = team.gender ?? ''
  const coach = (team.coach_last_name ?? '').toLowerCase()
  const key = `${by}|${gender}|${coach}`

  const field = historicalLookup.get(key)
  if (!field) {
    noMatch++
    continue
  }

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { team_id: team.team_id, season: '2026' },
    UpdateExpression: 'SET practice_field = :f',
    ExpressionAttributeValues: { ':f': field },
  }))

  console.log(`  ✓ ${team.team_name} → ${field}`)
  updated++
}

console.log(`\nDone:`)
console.log(`  Updated:   ${updated}`)
console.log(`  Skipped (already had field): ${skipped}`)
console.log(`  No match found: ${noMatch}`)

if (noMatch > 0) {
  console.log(`\nTeams with no historical match (set practice_field manually):`)
  for (const team of teams) {
    if (!team.practice_field) {
      const by = team.birth_year ?? ''
      const gender = team.gender ?? ''
      const coach = (team.coach_last_name ?? '').toLowerCase()
      const key = `${by}|${gender}|${coach}`
      if (!historicalLookup.has(key)) {
        console.log(`  - ${team.team_name}`)
      }
    }
  }
}
