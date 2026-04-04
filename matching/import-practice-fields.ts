/**
 * Import practice fields from Google Sheets CSV export.
 * Run: npx tsx matching/import-practice-fields.ts
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))

// Copy practice fields from season 1 to season 3 (2025 Fall Recreation)
// Many teams have the same name across seasons
const season3id = 3
const season1Teams = db.prepare(`SELECT name, coach, practice_field FROM teams WHERE season_id = 1 AND practice_field IS NOT NULL AND practice_field != ''`).all() as { name: string; coach: string; practice_field: string }[]

console.log(`Copying ${season1Teams.length} practice fields from season 1 to season 3...`)

const updateSeason3 = db.prepare(`UPDATE teams SET practice_field = ? WHERE name = ? AND season_id = ?`)
let updated = 0
for (const t of season1Teams) {
  const result = updateSeason3.run(t.practice_field, t.name, season3id)
  if (result.changes > 0) updated++
}
console.log(`Updated ${updated} teams in season 3`)

// Show sample
console.log('\nSample teams with practice fields in season 3:')
const sample = db.prepare(`
  SELECT name, coach, practice_field FROM teams WHERE practice_field IS NOT NULL AND practice_field != '' AND season_id = ? LIMIT 10
`).all(season3id) as { name: string; coach: string; practice_field: string }[]
for (const t of sample) {
  console.log(`  ${t.name} -> ${t.practice_field}`)
}

db.close()