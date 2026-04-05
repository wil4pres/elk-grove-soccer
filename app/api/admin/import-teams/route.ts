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

function parseGender(teamName: string): string {
  if (/\bG\b|Girl|girl/i.test(teamName)) return 'F'
  if (/\bB\b|Boy|boy/i.test(teamName)) return 'M'
  return ''
}

function parseBirthYear(teamName: string): number | null {
  const m = teamName.match(/(20\d{2})/)
  return m ? parseInt(m[1]) : null
}

function parseCoach(teamName: string): string {
  const m = teamName.match(/\(([^)]+)\)/)
  return m ? m[1] : ''
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
    db.pragma('foreign_keys = ON')

    const getSeason = db.prepare(`SELECT id FROM seasons WHERE name = ?`)
    const insertSeason = db.prepare(
      `INSERT OR IGNORE INTO seasons (name, year) VALUES (?, ?)`
    )

    function getOrCreateSeasonId(name: string): number {
      const row = getSeason.get(name) as { id: number } | undefined
      if (row) return row.id
      const yearMatch = name.match(/(\d{4})/)
      const year = yearMatch ? parseInt(yearMatch[1]) : null
      insertSeason.run(name, year)
      return (getSeason.get(name) as { id: number }).id
    }

    const insertPlayer = db.prepare(`
      INSERT OR IGNORE INTO players
        (id, first_name, last_name, gender, birth_date, account_email,
         account_first_name, account_last_name, account_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertTeam = db.prepare(`
      INSERT OR IGNORE INTO teams (id, name, season_id, gender, birth_year, coach)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const upsertAssignment = db.prepare(`
      INSERT OR REPLACE INTO team_assignments
        (player_id, team_id, season_id, assignment_status, tryout_note)
      VALUES (?, ?, ?, ?, ?)
    `)

    // Auto-generate stable IDs for teams with team_id = 0
    const teamNameToId = new Map<string, number>()
    let nextTeamId = 100000

    function getOrCreateTeamId(teamName: string, seasonId: number): number {
      const key = `${seasonId}:${teamName}`
      if (!teamNameToId.has(key)) {
        teamNameToId.set(key, nextTeamId++)
      }
      return teamNameToId.get(key)!
    }

    let playersInserted = 0
    let teamsInserted = 0
    let assignmentsUpserted = 0
    let skipped = 0
    let detectedSeason = ''

    const seenTeams = new Set<string>()

    const run = db.transaction(() => {
      for (const row of rows) {
        const playerId = cleanId(row['player_id'])
        if (!playerId) { skipped++; continue }

        const seasonName = row['season']?.trim() ?? ''
        if (!seasonName) { skipped++; continue }
        if (!detectedSeason) detectedSeason = seasonName

        const status = row['assignment_status']?.trim() ?? ''
        if (status.toLowerCase() !== 'rostered') { skipped++; continue }

        const seasonId = getOrCreateSeasonId(seasonName)

        const inserted = insertPlayer.run(
          playerId,
          row['player_first_name']?.trim() ?? '',
          row['player_last_name']?.trim() ?? '',
          row['gender']?.trim() ?? '',
          row['birth_date']?.trim() ?? '',
          row['account_email']?.trim() ?? '',
          row['account_first_name']?.trim() ?? '',
          row['account_last_name']?.trim() ?? '',
          (row['account_mobile_number'] ?? row['account_phone'] ?? '').trim(),
        )
        if (inserted.changes > 0) playersInserted++

        const teamName = row['team']?.trim() ?? ''
        const rawTeamId = cleanId(row['team_id'])

        if (teamName) {
          const teamId = rawTeamId && rawTeamId !== 0
            ? rawTeamId
            : getOrCreateTeamId(teamName, seasonId)

          const teamKey = `${seasonId}:${teamId}`
          if (!seenTeams.has(teamKey)) {
            seenTeams.add(teamKey)
            const t = insertTeam.run(
              teamId, teamName, seasonId,
              parseGender(teamName),
              parseBirthYear(teamName),
              parseCoach(teamName),
            )
            if (t.changes > 0) teamsInserted++
          }

          upsertAssignment.run(playerId, teamId, seasonId, status, row['tryout_note']?.trim() ?? '')
          assignmentsUpserted++
        }
      }
    })

    run()
    db.close()

    return NextResponse.json({
      total: rows.length,
      skipped,
      playersInserted,
      teamsInserted,
      assignmentsUpserted,
      season: detectedSeason,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[import-teams] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
