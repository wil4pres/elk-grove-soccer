import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { join } from 'path'
import { isSessionValid } from '@/lib/auth/session'

const DB_PATH = join(process.cwd(), 'matching', 'matching.db')

function cleanId(val: string | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : Math.floor(n)
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = (await req.json()) as { rows: Record<string, string>[] }

    if (!rows?.length) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')

    // Create table if it doesn't exist yet
    db.exec(`
      CREATE TABLE IF NOT EXISTS playmetrics_fields (
        id           INTEGER PRIMARY KEY,
        facility     TEXT,
        address      TEXT,
        identifier   TEXT,
        display_name TEXT,
        surface      TEXT,
        travel_field INTEGER DEFAULT 0,
        lat          REAL,
        lng          REAL
      )
    `)

    const insert = db.prepare(`
      INSERT OR REPLACE INTO playmetrics_fields
        (id, facility, address, identifier, display_name, surface, travel_field)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    let inserted = 0
    let skipped = 0

    const run = db.transaction(() => {
      // Full replace: clear existing data before re-importing
      db.prepare('DELETE FROM playmetrics_fields').run()

      for (const row of rows) {
        const id = cleanId(row['id'])
        if (!id) { skipped++; continue }

        const facility = row['facility']?.trim() ?? ''
        const identifier = row['identifier']?.trim() ?? ''
        // Build a human-readable display name
        const displayName = identifier
          ? `${facility} — ${identifier}`
          : facility

        insert.run(
          id,
          facility,
          row['address']?.trim() ?? '',
          identifier,
          displayName,
          row['surface']?.trim() ?? '',
          row['travel_Field'] === '1' ? 1 : 0,
        )
        inserted++
      }
    })

    run()
    db.close()

    const facilities = [...new Set(
      rows.filter(r => r['facility']?.trim()).map(r => r['facility'].trim())
    )].sort()

    const surfaces = Object.fromEntries(
      ['grass', 'turf', 'hardcourt'].map(s => [
        s,
        rows.filter(r => r['surface']?.trim().toLowerCase() === s).length,
      ])
    )

    return NextResponse.json({
      total: rows.length,
      inserted,
      skipped,
      facilities: facilities.length,
      surfaces,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[import-fields] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
