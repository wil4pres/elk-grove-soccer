/**
 * Use Claude AI to extract structured data (coaches, friends, teams) from
 * free-text special request fields in registrations.
 *
 * Run after import, before generating the report:
 *   npx tsx matching/extract-requests.ts [season-name]
 *
 * Example:
 *   npx tsx matching/extract-requests.ts "Fall Recreation 2026"
 *   npx tsx matching/extract-requests.ts   ← defaults to the most recent season
 */

import Anthropic from '@anthropic-ai/sdk'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))
db.pragma('journal_mode = WAL')

// Apply any schema additions (idempotent)
db.exec(`
  CREATE TABLE IF NOT EXISTS request_extractions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id     INTEGER NOT NULL,
    season_id     INTEGER NOT NULL,
    raw_request   TEXT,
    coaches       TEXT DEFAULT '[]',
    friends       TEXT DEFAULT '[]',
    teams         TEXT DEFAULT '[]',
    notes         TEXT DEFAULT '',
    model         TEXT,
    extracted_at  TEXT,
    UNIQUE(player_id, season_id)
  );
  CREATE INDEX IF NOT EXISTS idx_extractions_player ON request_extractions(player_id);
  CREATE INDEX IF NOT EXISTS idx_extractions_season ON request_extractions(season_id);
`)

const MODEL = 'claude-haiku-4-5-20251001'
const client = new Anthropic()

// ─── resolve season ───────────────────────────────────────────────────────────

const seasonArg = process.argv[2]
const season = seasonArg
  ? db.prepare(`SELECT id, name FROM seasons WHERE name = ?`).get(seasonArg) as { id: number; name: string } | undefined
  : db.prepare(`SELECT id, name FROM seasons ORDER BY id DESC LIMIT 1`).get() as { id: number; name: string } | undefined

if (!season) {
  console.error(`Season not found: "${seasonArg ?? 'latest'}"`)
  process.exit(1)
}
console.log(`Season: ${season.name} (id=${season.id})`)

// ─── load registrations with non-trivial special requests ─────────────────────

interface RegRow {
  player_id: number
  first_name: string
  last_name: string
  special_request: string
}

const SKIP = new Set(['n/a', 'na', 'none', '-', 'no', 'no request', 'n a'])

const rows = (db.prepare(`
  SELECT r.player_id, p.first_name, p.last_name, r.special_request
  FROM registrations r
  JOIN players p ON p.id = r.player_id
  LEFT JOIN request_extractions e ON e.player_id = r.player_id AND e.season_id = r.season_id
  WHERE r.season_id = ?
    AND r.special_request IS NOT NULL
    AND r.special_request != ''
    AND e.id IS NULL
`).all(season.id) as RegRow[]).filter(r => !SKIP.has(r.special_request.toLowerCase().trim()))

console.log(`${rows.length} registrations need extraction\n`)

if (!rows.length) {
  console.log('Nothing to do.')
  db.close()
  process.exit(0)
}

// ─── prompt ───────────────────────────────────────────────────────────────────

const SYSTEM = `You extract structured information from youth soccer registration special requests.
Return ONLY valid JSON with these keys:
  coaches: string[]   — coach full names or last names mentioned (e.g. ["Tim O'Brien", "Martinez"])
  friends: string[]   — player/child names mentioned as friend/teammate requests
  teams:   string[]   — team nicknames mentioned (e.g. ["Pink Panthers", "Firestorm"])
  notes:   string     — one short sentence if there is important context not captured above, else ""

Rules:
- Include a name even if only partially mentioned (last name only is fine)
- Do NOT include the registering player's own name
- If nothing fits a category, return an empty array []
- Return raw JSON only, no markdown fences`

function buildPrompt(row: RegRow): string {
  return `Player: ${row.first_name} ${row.last_name}
Special request: "${row.special_request}"`
}

// ─── extraction ───────────────────────────────────────────────────────────────

interface Extraction {
  coaches: string[]
  friends: string[]
  teams:   string[]
  notes:   string
}

async function extract(row: RegRow): Promise<Extraction> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildPrompt(row) }],
  })

  const text = (msg.content[0] as any).text.trim()
  try {
    return JSON.parse(text)
  } catch {
    // Try to pull JSON out if the model added any stray text
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error(`Unparseable response: ${text}`)
  }
}

// ─── upsert ───────────────────────────────────────────────────────────────────

const upsert = db.prepare(`
  INSERT OR REPLACE INTO request_extractions
    (player_id, season_id, raw_request, coaches, friends, teams, notes, model, extracted_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`)

// ─── main loop ────────────────────────────────────────────────────────────────

async function main() {
  let ok = 0, failed = 0

  for (const row of rows) {
    process.stdout.write(`  ${row.first_name} ${row.last_name}: "${row.special_request.slice(0, 60)}" → `)
    try {
      const ex = await extract(row)
      upsert.run(
        row.player_id, season.id, row.special_request,
        JSON.stringify(ex.coaches ?? []),
        JSON.stringify(ex.friends ?? []),
        JSON.stringify(ex.teams   ?? []),
        ex.notes ?? '',
        MODEL,
      )
      const parts = []
      if (ex.coaches.length) parts.push(`coaches: ${ex.coaches.join(', ')}`)
      if (ex.friends.length) parts.push(`friends: ${ex.friends.join(', ')}`)
      if (ex.teams.length)   parts.push(`teams: ${ex.teams.join(', ')}`)
      console.log(parts.length ? parts.join(' | ') : '(no match)')
      ok++
    } catch (e: any) {
      console.log(`ERROR: ${e.message}`)
      failed++
    }

    // ~3 req/sec to stay well within rate limits
    await new Promise(r => setTimeout(r, 350))
  }

  console.log(`\nDone: ${ok} extracted, ${failed} failed`)
  db.close()
}

main()
