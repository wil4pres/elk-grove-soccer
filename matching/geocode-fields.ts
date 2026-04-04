/**
 * Geocode practice fields via OpenStreetMap Nominatim.
 * Run once per season (or whenever field list changes):
 *   npx tsx matching/geocode-fields.ts
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))

// ─── schema ───────────────────────────────────────────────────────────────────
// Drop old schema if it exists with different columns, then recreate clean

const cols = (db.prepare('PRAGMA table_info(practice_fields)').all() as any[]).map(c => c.name)
if (cols.length && !cols.includes('lat')) {
  console.log('Migrating practice_fields table to new schema...')
  db.exec('DROP TABLE practice_fields')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS practice_fields (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL UNIQUE,
    lat     REAL,
    lng     REAL,
    address TEXT
  )
`)

// ─── fields with known addresses ─────────────────────────────────────────────
// Addresses sourced from previous DB data. For parks without a street address,
// Nominatim falls back to searching by park name + city.

const FIELDS: { name: string; address?: string }[] = [
  { name: 'Carlisle Woods Park',  address: '7920 Caymus Dr, Sacramento, CA 95829' },
  { name: 'Elk Grove Park',       address: '9950 Elk Grove Florin Rd, Elk Grove, CA 95624' },
  { name: 'Gates Park',           address: '9365 Mainline Drive, Elk Grove, CA 95624' },
  { name: 'Hawkins Park',         address: '2308 Bastona Dr, Elk Grove, CA 95758' },
  { name: 'Jan Rau Park',         address: '8795 Elk Grove Florin Rd, Elk Grove, CA 95757' },
  { name: 'Kunsting Park' },  // no address — will search by name
  { name: 'Lichtenberger North',  address: '6615 Kilconnell Drive, Elk Grove, CA 95758' },
  { name: 'Miwok Park',           address: '9344 Village Tree Dr, Elk Grove, CA 95758' },
  { name: 'Zehnder Park',         address: '9212 Edisto Way, Elk Grove, CA 95758' },
]

// ─── geocode ─────────────────────────────────────────────────────────────────

const upsert = db.prepare(`
  INSERT INTO practice_fields (name, lat, lng, address)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, address = excluded.address
`)

async function geocodeField(field: { name: string; address?: string }): Promise<void> {
  const query = field.address ?? `${field.name}, Elk Grove, CA, USA`
  const q = encodeURIComponent(query)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ElkGroveSoccer-TeamMatching/1.0' },
  })

  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)

  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[]

  if (!data.length) {
    console.log(`  NOT FOUND: ${field.name} (query: "${query}")`)
    return
  }

  const { lat, lon, display_name } = data[0]
  upsert.run(field.name, parseFloat(lat), parseFloat(lon), field.address ?? display_name)
  console.log(`  OK  ${field.name}`)
  console.log(`      ${lat}, ${lon}`)
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Geocoding practice fields via Nominatim...\n')

  for (const field of FIELDS) {
    await geocodeField(field)
    // Nominatim usage policy: max 1 request/second
    await new Promise(r => setTimeout(r, 1100))
  }

  console.log('\nStored fields:')
  const rows = db.prepare(`
    SELECT name, ROUND(lat, 5) as lat, ROUND(lng, 5) as lng, address
    FROM practice_fields ORDER BY name
  `).all()
  console.table(rows)

  db.close()
}

main().catch(err => { console.error(err); process.exit(1) })
