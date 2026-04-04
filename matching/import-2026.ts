/**
 * Import 2026 registration data into the matching DB.
 * Usage: npx tsx matching/import-2026.ts
 */

import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const REG_2026 = path.join(process.env.HOME!, 'Downloads', 'export (8).csv')

function cleanId(val: string | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : Math.floor(n)
}

// Add 2026 season
db.prepare(`INSERT OR IGNORE INTO seasons (name, year, is_current) VALUES (?, ?, ?)`).run('Fall Recreation 2026', 2026, 1)
const season2026 = db.prepare(`SELECT id FROM seasons WHERE name = 'Fall Recreation 2026'`).get() as { id: number }

const csv = parse(readFileSync(REG_2026, 'utf8'), {
  columns: true, skip_empty_lines: true, trim: true,
})

const insertPlayer = db.prepare(`
  INSERT OR IGNORE INTO players
    (id, first_name, last_name, gender, birth_date, account_email,
     account_first_name, account_last_name, account_phone, street, city, state, zip)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

// Fill in fields that may have been blank in the original import
const backfillPlayer = db.prepare(`
  UPDATE players SET
    birth_date = CASE WHEN (birth_date IS NULL OR birth_date = '') AND ? != '' THEN ? ELSE birth_date END,
    gender     = CASE WHEN (gender IS NULL OR gender = '') AND ? != '' THEN ? ELSE gender END
  WHERE id = ?
`)

const upsertReg = db.prepare(`
  INSERT OR REPLACE INTO registrations
    (player_id, season_id, package_name, school_and_grade, special_request,
     new_or_returning, registered_on, status, volunteer_head_coach, volunteer_asst_coach)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const run = db.transaction(() => {
  let n = 0
  for (const row of csv) {
    const pid = cleanId(row['player_id'])
    if (!pid) continue

    const birthDate = row['birth_date'] || ''
    const gender    = row['gender'] || ''

    insertPlayer.run(
      pid,
      row['player_first_name'] || '',
      row['player_last_name']  || '',
      gender,
      birthDate,
      row['account_email'] || '',
      row['account_first_name'] || '',
      row['account_last_name']  || '',
      row['account_phone'] || '',
      row['address'] || '',
      row['city']    || '',
      row['state']   || '',
      row['zip']     || '',
    )
    // Backfill any fields that were blank from a previous import
    backfillPlayer.run(birthDate, birthDate, gender, gender, pid)

    upsertReg.run(
      pid,
      season2026.id,
      row['package_name'] || '',
      row['School and Grade Fall 2026'] || '',
      row['Special Request - Team/Coach/Player'] || '',
      row['New or Returning Player'] || '',
      row['registered_on'] || '',
      row['status'] || '',
      row['volunteer_head_coach'] === 'true' ? 1 : 0,
      row['volunteer_assistant_coach'] === 'true' ? 1 : 0,
    )
    n++
  }
  console.log(`Imported ${n} 2026 registrations`)
})

run()
db.close()
