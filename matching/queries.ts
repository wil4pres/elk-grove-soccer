/**
 * Elk Grove Soccer — Team Matching Queries
 *
 * Run any query:
 *   npx tsx matching/queries.ts suggest "Tony DeLeon"
 *   npx tsx matching/queries.ts player 123456
 *   npx tsx matching/queries.ts team "Wolves"
 *   npx tsx matching/queries.ts siblings
 *   npx tsx matching/queries.ts unmatched
 *   npx tsx matching/queries.ts all-requests
 *   npx tsx matching/queries.ts school "Joseph Sims"
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'), { readonly: true })

const [, , command, ...args] = process.argv
const arg = args.join(' ')

// ─── helper ──────────────────────────────────────────────────────────────────

function print(rows: unknown[]) {
  if (!rows.length) { console.log('  (no results)'); return }
  console.table(rows)
}

// ─── QUERY 1: suggest team for a player by player_id ─────────────────────────
// Shows: last year's team + special request + siblings on other teams

function suggestForPlayer(playerId: number) {
  console.log(`\n=== Suggestions for player ${playerId} ===\n`)

  // Player info + 2025 registration
  const player = db.prepare(`
    SELECT p.id, p.first_name, p.last_name, p.gender, p.birth_date,
           p.account_email, p.zip,
           r.package_name, r.school_and_grade, r.special_request,
           r.new_or_returning
    FROM players p
    LEFT JOIN registrations r ON r.player_id = p.id
      AND r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
    WHERE p.id = ?
  `).get(playerId) as any

  if (!player) { console.log('Player not found'); return }

  console.log('PLAYER:')
  console.log(`  ${player.first_name} ${player.last_name} | ${player.gender} | DOB: ${player.birth_date}`)
  console.log(`  Package: ${player.package_name}`)
  console.log(`  School/Grade: ${player.school_and_grade}`)
  console.log(`  Special Request: ${player.special_request || '(none)'}`)
  console.log(`  New/Returning: ${player.new_or_returning}`)

  // Last year's team
  const lastTeam = db.prepare(`
    SELECT t.name as team_name, s.name as season, ta.tryout_note
    FROM team_assignments ta
    JOIN teams t ON t.id = ta.team_id
    JOIN seasons s ON s.id = ta.season_id
    WHERE ta.player_id = ?
    ORDER BY s.year DESC
    LIMIT 3
  `).all(playerId)

  console.log('\nPREVIOUS TEAM(S):')
  if (lastTeam.length) print(lastTeam)
  else console.log('  (no history)')

  // Siblings (same account_email, registered in 2025)
  const siblings = db.prepare(`
    SELECT p2.first_name, p2.last_name, p2.id as player_id,
           t.name as last_team, r2.package_name, r2.special_request
    FROM players p2
    JOIN registrations r2 ON r2.player_id = p2.id
      AND r2.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
    LEFT JOIN team_assignments ta ON ta.player_id = p2.id
      AND ta.season_id = (SELECT id FROM seasons WHERE name LIKE '%2024%' LIMIT 1)
    LEFT JOIN teams t ON t.id = ta.team_id
    WHERE p2.account_email = ? AND p2.account_email != ''
      AND p2.id != ?
  `).all(player.account_email, playerId)

  console.log('\nSIBLINGS (same account):')
  if (siblings.length) print(siblings)
  else console.log('  (none found)')

  // Special request match — who else requested the same coach/team?
  if (player.special_request) {
    const keywords = player.special_request.split(/[\s,\/]+/).filter((w: string) => w.length > 3)
    const likeTerms = keywords.map((k: string) => `%${k}%`)
    if (likeTerms.length) {
      const placeholders = likeTerms.map(() => 'r.special_request LIKE ?').join(' OR ')
      const others = db.prepare(`
        SELECT p2.first_name, p2.last_name, p2.id as player_id,
               r.special_request, r.package_name,
               t.name as last_team
        FROM registrations r
        JOIN players p2 ON p2.id = r.player_id
        LEFT JOIN team_assignments ta ON ta.player_id = p2.id
          AND ta.season_id = (SELECT id FROM seasons WHERE name LIKE '%2024%' LIMIT 1)
        LEFT JOIN teams t ON t.id = ta.team_id
        WHERE (${placeholders})
          AND r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
          AND r.player_id != ?
        LIMIT 20
      `).all(...likeTerms, playerId)

      console.log('\nOTHERS WITH SIMILAR REQUEST:')
      if (others.length) print(others)
      else console.log('  (none found)')
    }
  }
}

// ─── QUERY 2: find all players requesting a specific coach/team/player ────────

function suggestByRequest(searchTerm: string) {
  console.log(`\n=== Players requesting: "${searchTerm}" ===\n`)

  const rows = db.prepare(`
    SELECT p.first_name, p.last_name, p.id as player_id,
           p.gender, p.birth_date, p.account_email,
           r.package_name, r.school_and_grade, r.special_request,
           t.name as last_team_2024
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    LEFT JOIN team_assignments ta ON ta.player_id = p.id
      AND ta.season_id = (SELECT id FROM seasons WHERE name LIKE '%2024%' LIMIT 1)
    LEFT JOIN teams t ON t.id = ta.team_id
    WHERE r.special_request LIKE ? COLLATE NOCASE
      AND r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
    ORDER BY r.package_name, p.last_name
  `).all(`%${searchTerm}%`)

  print(rows)
  console.log(`\nTotal: ${rows.length}`)
}

// ─── QUERY 3: find all players on a given team last year ─────────────────────

function teamRoster(teamSearch: string) {
  console.log(`\n=== Teams matching: "${teamSearch}" ===\n`)

  const teams = db.prepare(`
    SELECT t.id, t.name, s.name as season, COUNT(ta.player_id) as players
    FROM teams t
    JOIN seasons s ON s.id = t.season_id
    LEFT JOIN team_assignments ta ON ta.team_id = t.id
    WHERE t.name LIKE ? COLLATE NOCASE
    GROUP BY t.id
    ORDER BY s.year DESC, t.name
  `).all(`%${teamSearch}%`)

  print(teams)

  if (teams.length === 1) {
    const team = teams[0] as any
    console.log(`\n--- Roster for "${team.name}" ---\n`)
    const roster = db.prepare(`
      SELECT p.first_name, p.last_name, p.id as player_id,
             p.gender, p.birth_date, p.account_email,
             r.school_and_grade, r.special_request, r.package_name as reg_2025
      FROM team_assignments ta
      JOIN players p ON p.id = ta.player_id
      LEFT JOIN registrations r ON r.player_id = p.id
        AND r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
      WHERE ta.team_id = ?
      ORDER BY p.last_name
    `).all(team.id)
    print(roster)
  }
}

// ─── QUERY 4: all sibling groups registered in 2025 ─────────────────────────

function siblingGroups() {
  console.log('\n=== Sibling groups (multiple players, same account) in 2025 ===\n')

  const rows = db.prepare(`
    SELECT p.account_email, p.account_first_name || ' ' || p.account_last_name as parent,
           COUNT(r.player_id) as num_players,
           GROUP_CONCAT(p.first_name || ' ' || p.last_name, ' / ') as players,
           GROUP_CONCAT(r.package_name, ' / ') as packages,
           GROUP_CONCAT(COALESCE(r.special_request,''), ' | ') as special_requests
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    WHERE r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
      AND p.account_email != ''
    GROUP BY p.account_email
    HAVING COUNT(r.player_id) > 1
    ORDER BY num_players DESC
  `).all()

  print(rows)
  console.log(`\nTotal sibling groups: ${rows.length}`)
}

// ─── QUERY 5: players registered in 2025 but no team yet (for new assignment) ─

function unmatched() {
  console.log('\n=== 2025 registrants with no 2024 team assignment ===\n')

  const rows = db.prepare(`
    SELECT p.first_name, p.last_name, p.id as player_id,
           p.gender, p.birth_date, p.zip,
           r.package_name, r.school_and_grade, r.special_request, r.new_or_returning
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    WHERE r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
      AND NOT EXISTS (
        SELECT 1 FROM team_assignments ta
        WHERE ta.player_id = p.id
          AND ta.season_id = (SELECT id FROM seasons WHERE name LIKE '%2024%' LIMIT 1)
      )
    ORDER BY r.package_name, p.last_name
  `).all()

  print(rows)
  console.log(`\nTotal unmatched (new players or no 2024 history): ${rows.length}`)
}

// ─── QUERY 6: all special requests summary ───────────────────────────────────

function allRequests() {
  console.log('\n=== All special requests (2025 registrations) ===\n')

  const rows = db.prepare(`
    SELECT p.first_name, p.last_name, p.id as player_id,
           r.package_name, r.special_request,
           t.name as last_team_2024
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    LEFT JOIN team_assignments ta ON ta.player_id = p.id
      AND ta.season_id = (SELECT id FROM seasons WHERE name LIKE '%2024%' LIMIT 1)
    LEFT JOIN teams t ON t.id = ta.team_id
    WHERE r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
      AND r.special_request != ''
      AND r.special_request IS NOT NULL
      AND LOWER(r.special_request) NOT IN ('n/a','na','none','-')
    ORDER BY r.package_name, r.special_request
  `).all()

  print(rows)
  console.log(`\nTotal with special requests: ${rows.length}`)
}

// ─── QUERY 7: players by school ──────────────────────────────────────────────

function bySchool(schoolSearch: string) {
  console.log(`\n=== Players attending school matching: "${schoolSearch}" ===\n`)

  const rows = db.prepare(`
    SELECT r.school_and_grade,
           p.first_name, p.last_name, p.id as player_id,
           r.package_name, r.special_request,
           t.name as last_team_2024
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    LEFT JOIN team_assignments ta ON ta.player_id = p.id
      AND ta.season_id = (SELECT id FROM seasons WHERE name LIKE '%2024%' LIMIT 1)
    LEFT JOIN teams t ON t.id = ta.team_id
    WHERE r.school_and_grade LIKE ? COLLATE NOCASE
      AND r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025')
    ORDER BY r.school_and_grade, r.package_name, p.last_name
  `).all(`%${schoolSearch}%`)

  print(rows)
  console.log(`\nTotal: ${rows.length}`)
}

// ─── router ───────────────────────────────────────────────────────────────────

switch (command) {
  case 'player':
    suggestForPlayer(parseInt(arg))
    break
  case 'suggest':
    suggestByRequest(arg)
    break
  case 'team':
    teamRoster(arg)
    break
  case 'siblings':
    siblingGroups()
    break
  case 'unmatched':
    unmatched()
    break
  case 'all-requests':
    allRequests()
    break
  case 'school':
    bySchool(arg)
    break
  default:
    console.log(`
Usage:
  npx tsx matching/queries.ts suggest "Tony DeLeon"
  npx tsx matching/queries.ts player 123456
  npx tsx matching/queries.ts team "Wolves"
  npx tsx matching/queries.ts siblings
  npx tsx matching/queries.ts unmatched
  npx tsx matching/queries.ts all-requests
  npx tsx matching/queries.ts school "Joseph Sims"
    `)
}

db.close()
