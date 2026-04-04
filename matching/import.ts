/**
 * Import CSV data into local SQLite database.
 *
 * Usage:
 *   npx tsx matching/import.ts
 *
 * Expected CSV files (update paths if needed):
 *   TEAMS_CSV  = consolidated_players_subscription.csv  (historical team assignments)
 *   REG_CSV    = export (7).csv                         (2025 Fall registration form data)
 */

import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DB_PATH     = path.join(__dirname, 'matching.db')
const SCHEMA      = path.join(__dirname, 'schema.sql')
const TEAMS_CSV   = path.join(process.env.HOME!, 'Downloads', 'consolidated_players_subscription.csv')
const REG_CSV     = path.join(process.env.HOME!, 'Downloads', 'export (7).csv')
const COACHES_CSV = path.join(process.env.HOME!, 'Downloads', 'all-coaches.csv')

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseGender(team: string): string {
  if (/\bG\b|Girl|girl/i.test(team)) return 'F'
  if (/\bB\b|Boy|boy/i.test(team)) return 'M'
  return ''
}

function parseBirthYear(team: string): number | null {
  const m = team.match(/(20\d{2})/)
  return m ? parseInt(m[1]) : null
}

function parseCoach(team: string): string {
  // "2012B Destroyers (Bailey)" → "Bailey"
  const m = team.match(/\(([^)]+)\)/)
  return m ? m[1] : ''
}

function cleanId(val: string | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : Math.floor(n)
}

// ─── main ────────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Apply schema
db.exec(readFileSync(SCHEMA, 'utf8'))

// ─── seasons ─────────────────────────────────────────────────────────────────

const insertSeason = db.prepare(`
  INSERT OR IGNORE INTO seasons (name, year, is_current) VALUES (?, ?, ?)
`)
const getSeason = db.prepare(`SELECT id FROM seasons WHERE name = ?`)

const seasonNames = [
  { name: 'Fall Recreation 2024', year: 2024, current: 0 },
  { name: 'Fall Recreation 2025', year: 2025, current: 0 },
  { name: '2025 Fall Recreation', year: 2025, current: 0 },
  { name: 'Spring 2024',          year: 2024, current: 0 },
]
for (const s of seasonNames) insertSeason.run(s.name, s.year, s.current)

function getOrCreateSeasonId(name: string): number {
  const row = getSeason.get(name) as { id: number } | undefined
  if (row) return row.id
  const info = db.prepare(`INSERT OR IGNORE INTO seasons (name, year) VALUES (?, NULL)`).run(name)
  return info.lastInsertRowid as number
}

// ─── import consolidated_players_subscription.csv (historical team data) ─────

console.log('Importing historical team assignments...')

const teamsCsv = parse(readFileSync(TEAMS_CSV, 'utf8'), {
  columns: true, skip_empty_lines: true, trim: true,
})

const insertPlayer = db.prepare(`
  INSERT OR IGNORE INTO players
    (id, first_name, last_name, gender, birth_date, account_email,
     account_first_name, account_last_name, account_phone, street, city, state, zip)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertTeam = db.prepare(`
  INSERT OR IGNORE INTO teams (id, name, season_id, gender, birth_year, coach)
  VALUES (?, ?, ?, ?, ?, ?)
`)

// Auto-generate stable integer IDs for teams that have no PlayMetrics team_id
const teamNameToId = new Map<string, number>()
let nextTeamId = 100000  // start high to avoid collisions with real IDs
function getOrCreateTeamId(teamName: string, seasonId: number): number {
  const key = `${seasonId}:${teamName}`
  if (!teamNameToId.has(key)) {
    teamNameToId.set(key, nextTeamId++)
  }
  return teamNameToId.get(key)!
}

const insertAssignment = db.prepare(`
  INSERT OR IGNORE INTO team_assignments
    (player_id, team_id, season_id, assignment_status, tryout_note)
  VALUES (?, ?, ?, ?, ?)
`)

const importTeams = db.transaction(() => {
  let skipped = 0
  let inserted = 0

  for (const row of teamsCsv) {
    const playerId = cleanId(row['player_id'] || row['id'])
    if (!playerId) { skipped++; continue }

    const seasonName = row['season'] || ''
    if (!seasonName) { skipped++; continue }
    const seasonId = getOrCreateSeasonId(seasonName)

    // Player
    insertPlayer.run(
      playerId,
      row['player_first_name_team'] || row['player_first_name_subscription'] || '',
      row['player_last_name_team']  || row['player_last_name_subscription']  || '',
      row['gender'] || '',
      row['birth_date'] || '',
      row['parent1_email'] || row['billing_account_email'] || '',
      row['parent1_first_name'] || row['billing_account_first_name'] || '',
      row['parent1_last_name']  || row['billing_account_last_name']  || '',
      row['parent1_mobile_number'] || '',
      row['street_team'] || row['street_subscription'] || '',
      row['city_team']   || row['city_subscription']   || '',
      row['state_team']  || row['state_subscription']  || '',
      row['zip_team']    || row['zip_subscription']    || '',
    )

    // Team — team_id in this CSV is always 0; use team name+season as unique key
    const teamName = row['team'] || row['team_name'] || ''
    if (teamName) {
      // Use getOrCreateTeamId to auto-assign an integer ID per unique team+season
      const teamId = getOrCreateTeamId(teamName, seasonId)
      insertTeam.run(
        teamId, teamName, seasonId,
        parseGender(teamName),
        parseBirthYear(teamName),
        parseCoach(teamName),
      )
      insertAssignment.run(playerId, teamId, seasonId, row['assignment_status'] || '', row['tryout_note'] || '')
    }

    inserted++
  }

  console.log(`  Players/assignments: ${inserted} processed, ${skipped} skipped`)
})

importTeams()

// ─── import export (7).csv (registration form data) ──────────────────────────

console.log('Importing 2025 Fall registration form data...')

const regCsv = parse(readFileSync(REG_CSV, 'utf8'), {
  columns: true, skip_empty_lines: true, trim: true,
})

const insertRegPlayer = db.prepare(`
  INSERT OR IGNORE INTO players
    (id, first_name, last_name, gender, birth_date, account_email,
     account_first_name, account_last_name, account_phone, street, city, state, zip)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const upsertRegistration = db.prepare(`
  INSERT OR REPLACE INTO registrations
    (player_id, season_id, package_name, school_and_grade, special_request,
     new_or_returning, registered_on, status, volunteer_head_coach, volunteer_asst_coach)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const importReg = db.transaction(() => {
  let inserted = 0
  // Registration data is for "Fall Recreation 2025" / "2025 Fall Recreation"
  const seasonId = getOrCreateSeasonId('Fall Recreation 2025')

  for (const row of regCsv) {
    const playerId = cleanId(row['player_id'])
    if (!playerId) continue

    insertRegPlayer.run(
      playerId,
      row['player_first_name'] || '',
      row['player_last_name']  || '',
      '',        // gender not in this CSV
      '',        // birth_date not in this CSV
      row['account_email'] || '',
      row['account_first_name'] || '',
      row['account_last_name']  || '',
      row['account_phone'] || '',
      row['address'] || '',
      row['city']    || '',
      row['state']   || '',
      row['zip']     || '',
    )

    upsertRegistration.run(
      playerId,
      seasonId,
      row['package_name'] || '',
      row['School and Grade Fall 2025'] || '',
      row['Special Request - Team/Coach/Player'] || '',
      row['New or Returning Player'] || '',
      row['registered_on'] || '',
      row['status'] || '',
      row['volunteer_head_coach'] === 'Yes' ? 1 : 0,
      row['volunteer_assistant_coach'] === 'Yes' ? 1 : 0,
    )
    inserted++
  }
  console.log(`  Registrations: ${inserted} imported`)
})

importReg()

// ─── import all-coaches.csv ───────────────────────────────────────────────────

console.log('Importing coaches...')

const coachesCsv = parse(readFileSync(COACHES_CSV, 'utf8'), {
  columns: true, skip_empty_lines: true, trim: true,
})

const insertCoach = db.prepare(`
  INSERT OR IGNORE INTO coaches
    (user_id, first_name, last_name, email, mobile_number, team_id, team_name, season, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const importCoaches = db.transaction(() => {
  let inserted = 0
  for (const row of coachesCsv) {
    if (!row['first_name'] || !row['last_name']) continue
    insertCoach.run(
      cleanId(row['user_id']) ?? null,
      row['first_name'].trim(),
      row['last_name'].trim(),
      row['email'] || '',
      row['mobile_number'] || '',
      cleanId(row['team_id']) ?? null,
      row['team_name'] || '',
      row['season'] || '',
      row['role'] || '',
    )
    inserted++
  }
  console.log(`  Coaches: ${inserted} records imported`)
})

importCoaches()

// ─── verify ───────────────────────────────────────────────────────────────────

const stats = {
  players:          (db.prepare(`SELECT COUNT(*) as n FROM players`).get() as any).n,
  teams:            (db.prepare(`SELECT COUNT(*) as n FROM teams`).get() as any).n,
  seasons:          (db.prepare(`SELECT COUNT(*) as n FROM seasons`).get() as any).n,
  assignments:      (db.prepare(`SELECT COUNT(*) as n FROM team_assignments`).get() as any).n,
  registrations:    (db.prepare(`SELECT COUNT(*) as n FROM registrations`).get() as any).n,
  coaches:          (db.prepare(`SELECT COUNT(DISTINCT user_id) as n FROM coaches`).get() as any).n,
  coach_records:    (db.prepare(`SELECT COUNT(*) as n FROM coaches`).get() as any).n,
  with_special_req: (db.prepare(`SELECT COUNT(*) as n FROM registrations WHERE special_request != '' AND special_request IS NOT NULL AND LOWER(special_request) NOT IN ('n/a','na','none')`).get() as any).n,
}

console.log('\n=== Database summary ===')
for (const [k, v] of Object.entries(stats)) {
  console.log(`  ${k.padEnd(20)} ${v}`)
}
console.log(`\nDatabase written to: ${DB_PATH}`)
db.close()
