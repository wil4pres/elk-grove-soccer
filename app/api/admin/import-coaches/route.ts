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

    // Detect the season from the first non-empty season value
    const detectedSeason = rows.find(r => r['season']?.trim())?.['season']?.trim() ?? ''

    const deleteForSeason = db.prepare(`DELETE FROM coaches WHERE season = ?`)
    const insertCoach = db.prepare(`
      INSERT INTO coaches (user_id, first_name, last_name, email, mobile_number, team_id, team_name, season, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let inserted = 0
    let skipped = 0

    const run = db.transaction(() => {
      // Full replace for the season: remove all existing rows first
      if (detectedSeason) deleteForSeason.run(detectedSeason)

      for (const row of rows) {
        const userId = cleanId(row['user_id'])
        if (!userId) { skipped++; continue }

        const season = row['season']?.trim() ?? ''
        if (!season) { skipped++; continue }

        insertCoach.run(
          userId,
          row['first_name']?.trim() ?? '',
          row['last_name']?.trim() ?? '',
          row['email']?.trim() ?? '',
          row['mobile_number']?.trim() ?? '',
          cleanId(row['team_id']),
          row['team_name']?.trim() ?? '',
          season,
          row['role']?.trim() ?? '',
        )
        inserted++
      }
    })

    run()
    db.close()

    const uniqueCoaches = new Set(rows.filter(r => r['user_id']?.trim()).map(r => r['user_id'])).size
    const uniqueTeams = new Set(rows.filter(r => r['team_name']?.trim()).map(r => r['team_name'])).size

    return NextResponse.json({
      total: rows.length,
      inserted,
      skipped,
      uniqueCoaches,
      uniqueTeams,
      season: detectedSeason,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[import-coaches] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
