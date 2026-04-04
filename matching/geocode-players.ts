/**
 * Geocode player street addresses via the US Census Geocoder batch API.
 * Free, no API key needed. Street-level accuracy.
 *
 * Run once per season (skips already-geocoded players):
 *   npx tsx matching/geocode-players.ts
 *
 * Re-run at any time — only processes players missing lat/lng.
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))

// ─── schema ───────────────────────────────────────────────────────────────────

// Add lat/lng to players table if not already there
try { db.exec('ALTER TABLE players ADD COLUMN lat REAL') } catch { /* already exists */ }
try { db.exec('ALTER TABLE players ADD COLUMN lng REAL') } catch { /* already exists */ }

// ─── load players needing geocoding ──────────────────────────────────────────

interface PlayerRow {
  id: number
  street: string
  city: string
  state: string
  zip: string
}

const players = db.prepare(`
  SELECT id, street, city, state, zip
  FROM players
  WHERE street IS NOT NULL AND street != ''
    AND (lat IS NULL OR lng IS NULL)
  ORDER BY id
`).all() as PlayerRow[]

console.log(`Players to geocode: ${players.length}`)
if (!players.length) {
  console.log('All players already geocoded.')
  db.close()
  process.exit(0)
}

// ─── Census batch geocoder ───────────────────────────────────────────────────
// Docs: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf
// Format: ID,Street,City,State,ZIP  (no header row)
// Returns: ID,InputAddress,Match,ExactMatch,MatchedAddress,"lng,lat",TigerLineID,Side

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch'
const BATCH_SIZE = 1000  // Census max per request

async function geocodeBatch(batch: PlayerRow[]): Promise<Map<number, { lat: number; lng: number }>> {
  const csv = batch
    .map(p => `${p.id},"${(p.street || '').replace(/"/g, '')}","${p.city || 'Elk Grove'}","${p.state || 'CA'}","${p.zip || ''}"`)
    .join('\n')

  const form = new FormData()
  form.append('addressFile', new Blob([csv], { type: 'text/csv' }), 'addresses.csv')
  form.append('benchmark', 'Public_AR_Current')

  const res = await fetch(CENSUS_URL, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Census geocoder HTTP ${res.status}: ${await res.text()}`)

  const text = await res.text()
  const results = new Map<number, { lat: number; lng: number }>()

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // CSV fields may be quoted — split carefully
    const parts = trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    const id = parseInt(parts[0].replace(/"/g, ''))
    if (isNaN(id)) continue

    const matched = parts[2]?.replace(/"/g, '').trim()
    if (matched !== 'Match') continue

    // Coordinates field: "lng,lat" (longitude first)
    const coords = parts[5]?.replace(/"/g, '').trim()
    if (!coords) continue

    const [lngStr, latStr] = coords.split(',')
    const lng = parseFloat(lngStr)
    const lat = parseFloat(latStr)
    if (!isNaN(lat) && !isNaN(lng)) {
      results.set(id, { lat, lng })
    }
  }

  return results
}

// ─── main ─────────────────────────────────────────────────────────────────────

const updatePlayer = db.prepare('UPDATE players SET lat = ?, lng = ? WHERE id = ?')

async function main() {
  let totalMatched = 0
  const totalBatches = Math.ceil(players.length / BATCH_SIZE)

  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} addresses)... `)

    const results = await geocodeBatch(batch)

    db.transaction(() => {
      for (const [id, { lat, lng }] of results) {
        updatePlayer.run(lat, lng, id)
      }
    })()

    totalMatched += results.size
    console.log(`${results.size} matched`)
  }

  const total = players.length
  const missed = total - totalMatched
  console.log(`\nGeocoded: ${totalMatched}/${total}`)
  if (missed > 0) {
    console.log(`Unmatched: ${missed} (likely incomplete or very new addresses — will be skipped in proximity scoring)`)
  }

  db.close()
}

main().catch(err => { console.error(err); process.exit(1) })
