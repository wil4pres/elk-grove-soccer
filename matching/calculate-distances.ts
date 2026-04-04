/**
 * Calculate road-network drive distances (meters) from each player to each
 * practice field using the OpenRouteService Matrix API.
 *
 * Get a free API key at: https://openrouteservice.org/dev/#/signup
 *
 * Run once per season (skips already-calculated pairs):
 *   ORS_API_KEY=your_key npx tsx matching/calculate-distances.ts
 *
 * Free tier: 2000 requests/day, 3500 matrix elements/request.
 * With 8 fields, batches of 400 players → ~2 API calls for a full season.
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))

const ORS_KEY = process.env.ORS_API_KEY
if (!ORS_KEY) {
  console.error('Missing ORS_API_KEY.')
  console.error('Get a free key at https://openrouteservice.org/dev/#/signup')
  console.error('Then run: ORS_API_KEY=your_key npx tsx matching/calculate-distances.ts')
  process.exit(1)
}

// ─── schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS field_distances (
    player_id     INTEGER NOT NULL,
    field_name    TEXT NOT NULL,
    drive_meters  INTEGER,
    calculated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (player_id, field_name)
  )
`)

// ─── load data ────────────────────────────────────────────────────────────────

const fields = db.prepare(`
  SELECT name, lat, lng FROM practice_fields WHERE lat IS NOT NULL ORDER BY name
`).all() as { name: string; lat: number; lng: number }[]

if (!fields.length) {
  console.error('No practice fields found. Run geocode-fields.ts first.')
  process.exit(1)
}
console.log(`Fields (${fields.length}): ${fields.map(f => f.name).join(', ')}\n`)

// Only players with coordinates not yet fully calculated
const players = db.prepare(`
  SELECT p.id, p.lat, p.lng
  FROM players p
  WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM field_distances fd
      WHERE fd.player_id = p.id
    )
  ORDER BY p.id
`).all() as { id: number; lat: number; lng: number }[]

console.log(`Players to process: ${players.length}`)
if (!players.length) {
  console.log('All players already have distances. Done.')
  db.close()
  process.exit(0)
}

// ─── ORS Matrix API ───────────────────────────────────────────────────────────
// Max elements per request = 3500. With 8 fields: 3500 / 8 = 437 players/batch.
// Using 400 for a comfortable margin.

const ORS_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car'
const BATCH_SIZE = 388  // 388 × 9 fields = 3492, under ORS 3500 element limit

interface OrsMatrixResponse {
  distances: (number | null)[][]
}

async function calcBatch(batch: { id: number; lat: number; lng: number }[]): Promise<void> {
  // ORS locations: [lng, lat] order — players first, then fields
  const locations = [
    ...batch.map(p => [p.lng, p.lat]),
    ...fields.map(f => [f.lng, f.lat]),
  ]
  const sources      = batch.map((_, i) => i)
  const destinations = fields.map((_, i) => batch.length + i)

  const res = await fetch(ORS_URL, {
    method: 'POST',
    headers: {
      'Authorization': ORS_KEY!,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body: JSON.stringify({
      locations,
      sources,
      destinations,
      metrics: ['distance'],  // meters, road network
      units:   'm',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ORS HTTP ${res.status}: ${body}`)
  }

  const data = (await res.json()) as OrsMatrixResponse

  db.transaction(() => {
    const insert = db.prepare(`
      INSERT OR REPLACE INTO field_distances (player_id, field_name, drive_meters)
      VALUES (?, ?, ?)
    `)
    for (let pi = 0; pi < batch.length; pi++) {
      for (let fi = 0; fi < fields.length; fi++) {
        const meters = data.distances[pi]?.[fi]
        if (meters != null) {
          insert.run(batch[pi].id, fields[fi].name, Math.round(meters))
        }
      }
    }
  })()
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const totalBatches = Math.ceil(players.length / BATCH_SIZE)

  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch      = players.slice(i, i + BATCH_SIZE)
    const batchNum   = Math.floor(i / BATCH_SIZE) + 1
    const elements   = batch.length * fields.length

    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} players × ${fields.length} fields = ${elements} elements)... `)
    await calcBatch(batch)
    console.log('done')

    // Brief pause between batches to be respectful to the free tier
    if (i + BATCH_SIZE < players.length) await new Promise(r => setTimeout(r, 600))
  }

  // ── summary ──
  console.log('\nSample distances (miles):')
  const sample = db.prepare(`
    SELECT p.first_name || ' ' || p.last_name AS player,
           fd.field_name,
           ROUND(fd.drive_meters / 1609.34, 2) AS drive_miles
    FROM field_distances fd
    JOIN players p ON p.id = fd.player_id
    ORDER BY fd.player_id, fd.drive_meters
    LIMIT 24
  `).all()
  console.table(sample)

  const count = (db.prepare('SELECT COUNT(*) as n FROM field_distances').get() as any).n
  console.log(`\nTotal distance records stored: ${count}`)

  db.close()
}

main().catch(err => { console.error(err); process.exit(1) })
