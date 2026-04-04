/**
 * Generate focused HTML report for 2026 test registrations.
 * Usage: npx tsx matching/generate-2026-test.ts
 */

import Database from 'better-sqlite3'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))
// Ensure AI extractions table exists (created by extract-requests.ts, but safe to create here too)
db.exec(`
  CREATE TABLE IF NOT EXISTS request_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL, season_id INTEGER NOT NULL,
    raw_request TEXT, coaches TEXT DEFAULT '[]', friends TEXT DEFAULT '[]',
    teams TEXT DEFAULT '[]', notes TEXT DEFAULT '', model TEXT, extracted_at TEXT,
    UNIQUE(player_id, season_id)
  )
`)

// ─── types ───────────────────────────────────────────────────────────────────

interface Player2026 {
  id: number
  first_name: string
  last_name: string
  gender: string
  birth_date: string
  birth_year: number
  account_email: string
  zip: string
  package_name: string
  school_and_grade: string
  special_request: string
  new_or_returning: string
  // previous season data
  prev_team: string
  prev_season: string
}

interface Team { id: number; name: string; coach: string; birth_year: number }
interface Suggestion { team: string; score: number; reasons: string[] }
interface Extraction { coaches: string[]; friends: string[]; teams: string[] }

// ─── data ────────────────────────────────────────────────────────────────────

const season2026id = (db.prepare(`SELECT id FROM seasons WHERE name = 'Fall Recreation 2026'`).get() as any).id
const season2025id = (db.prepare(`SELECT id FROM seasons WHERE name LIKE '%2025%' ORDER BY id DESC LIMIT 1`).get() as any)?.id
const season2024id = (db.prepare(`SELECT id FROM seasons WHERE name LIKE '%2024%' ORDER BY id DESC LIMIT 1`).get() as any)?.id

const players: Player2026[] = db.prepare(`
  SELECT p.id, p.first_name, p.last_name, p.gender, p.birth_date,
         CAST(SUBSTR(p.birth_date, 1, 4) AS INTEGER) as birth_year,
         p.account_email, p.zip,
         r.package_name, r.school_and_grade, r.special_request, r.new_or_returning,
         COALESCE(t25.name, t24.name, '') as prev_team,
         CASE WHEN t25.name IS NOT NULL THEN '2025 Fall Recreation'
              WHEN t24.name IS NOT NULL THEN 'Fall Recreation 2024'
              ELSE '' END as prev_season
  FROM registrations r
  JOIN players p ON p.id = r.player_id
  LEFT JOIN team_assignments ta25 ON ta25.player_id = p.id AND ta25.season_id = ?
  LEFT JOIN teams t25 ON t25.id = ta25.team_id
  LEFT JOIN team_assignments ta24 ON ta24.player_id = p.id AND ta24.season_id = ?
  LEFT JOIN teams t24 ON t24.id = ta24.team_id
  WHERE r.season_id = ?
  ORDER BY r.package_name, p.last_name
`).all(season2025id, season2024id, season2026id) as Player2026[]

// Infer birth year from package name when birth_date is missing.
// Handles: "U12 Boys" → 2026-12=2014  AND  "2014 Boys" → 2014
function inferBirthYear(player: Player2026): number {
  if (player.birth_year > 0) return player.birth_year
  const pkg = player.package_name || ''
  const uAge = pkg.match(/U(\d+)/)
  if (uAge) return 2026 - parseInt(uAge[1])
  const year = pkg.match(/(20\d{2})/)
  if (year) return parseInt(year[1])
  return 0
}

function getTeams(birthYear: number, gender: string): Team[] {
  const gCode  = gender === 'F' ? 'G' : 'B'
  const uAge   = 2026 - birthYear   // e.g. born 2010 → U16 for Fall 2026
  // Teams use two naming conventions:
  //   "2010G Fireballs (Coach)"       → birth-year prefix
  //   "Elk Grove Soccer U16G Firestorm (Costa)" → U-age prefix
  return db.prepare(`
    SELECT id, name, COALESCE(coach,'') as coach, COALESCE(birth_year,0) as birth_year
    FROM teams
    WHERE name LIKE ? OR name LIKE ? OR name LIKE ?
    GROUP BY name ORDER BY name
  `).all(`${birthYear}${gCode}%`, `%U${uAge}${gCode}%`, `%U${uAge} ${gCode}%`) as Team[]
}

function getCoachesForTeam(teamName: string): { first: string; last: string }[] {
  return db.prepare(`
    SELECT first_name as first, last_name as last FROM coaches WHERE team_name = ? COLLATE NOCASE
  `).all(teamName) as any[]
}

function getExtraction(playerId: number): Extraction {
  const row = db.prepare(
    `SELECT coaches, friends, teams FROM request_extractions WHERE player_id = ? AND season_id = ?`
  ).get(playerId, season2026id) as any
  if (!row) return { coaches: [], friends: [], teams: [] }
  return {
    coaches: JSON.parse(row.coaches || '[]'),
    friends: JSON.parse(row.friends || '[]'),
    teams:   JSON.parse(row.teams   || '[]'),
  }
}

// Returns 2026 co-registrants under the same account (family members in current season)
function getFamily2026(email: string, pid: number): Player2026[] {
  if (!email) return []
  return players.filter(p => p.id !== pid && p.account_email === email)
}

function getSiblingTeams(email: string, pid: number): string[] {
  if (!email) return []
  return (db.prepare(`
    SELECT DISTINCT t.name FROM players p
    JOIN team_assignments ta ON ta.player_id = p.id
    JOIN teams t ON t.id = ta.team_id
    WHERE p.account_email = ? AND p.id != ?
  `).all(email, pid) as any[]).map(r => r.name)
}

// ─── scoring ─────────────────────────────────────────────────────────────────

// Normalize a string for fuzzy matching: lowercase, strip apostrophes/hyphens/dots
function norm(s: string): string {
  return s.toLowerCase().replace(/['\u2019\-\.]/g, '')
}

function score(player: Player2026, team: Team, allPlayers: Player2026[]): Suggestion {
  const reasons: string[] = []
  let total = 0
  const req     = (player.special_request || '').toLowerCase()
  const reqNorm = norm(player.special_request || '')
  const ex      = getExtraction(player.id)  // AI-extracted structured data (empty if not yet run)

  if (player.prev_team && player.prev_team === team.name) {
    total += 3; reasons.push('Returning to same team')
    const teamYear = team.birth_year && team.birth_year > 0 ? team.birth_year
                   : parseInt(team.name.match(/(20\d{2})[BG]/)?.[1] ?? '0')
    if (teamYear && teamYear !== player.birth_year) {
      reasons.push(`Playing up/down (born ${player.birth_year}, team ${teamYear}) — coordinator verify`)
    }
  }

  // ── Coach match ──────────────────────────────────────────────────────────────
  const teamCoaches = getCoachesForTeam(team.name)
  let coachMatched = false

  // 1. AI-extracted names matched against this team's coaches
  for (const extracted of ex.coaches) {
    const en = norm(extracted)
    for (const c of teamCoaches) {
      const cn = norm(c.last), cf = norm(c.first)
      if (en.includes(cn) || en.includes(cf) || en === `${cf} ${cn}`) {
        total += 3; reasons.push(`Requested coach "${c.first} ${c.last}" (AI)`); coachMatched = true; break
      }
    }
    if (coachMatched) break
  }

  // 2. Raw string match (fallback / no extraction)
  if (!coachMatched) {
    for (const c of teamCoaches) {
      const last = norm(c.last), first = norm(c.first)
      if ((last.length > 2 && reqNorm.includes(last)) || (first.length > 3 && reqNorm.includes(first)) || reqNorm.includes(`${first} ${last}`)) {
        total += 3; reasons.push(`Requested coach "${c.first} ${c.last}"`); coachMatched = true; break
      }
    }
  }

  // 3. Fallback: coach parsed from team name
  if (!coachMatched && team.coach && team.coach.length > 2 && reqNorm.includes(norm(team.coach))) {
    total += 3; reasons.push(`Requested coach "${team.coach}"`)
  }

  // ── Team nickname ────────────────────────────────────────────────────────────
  const nick = team.name.match(/\d{4}[BG]\s+(.+?)\s+\(/) || team.name.match(/U\d+\s*[BG]\s+(.+?)\s+\(/)
  if (nick) {
    const nickLower = nick[1].toLowerCase()
    const nickWords = nickLower.split(/\s+/).filter(w => w.length > 4)
    const aiTeamMatch = ex.teams.some(t => norm(t) === norm(nick[1]) || norm(nick[1]).includes(norm(t)) || norm(t).includes(norm(nick[1])))
    if (aiTeamMatch || req.includes(nickLower) || nickWords.some(w => req.includes(w))) {
      total += 2; reasons.push(`Requested team "${nick[1]}"${aiTeamMatch ? ' (AI)' : ''}`)
    }
  }

  // ── Friend / player request ──────────────────────────────────────────────────
  const checkedFriends = new Set<number>()

  // 1. AI-extracted friend names matched against 2026 players
  for (const friendName of ex.friends) {
    const fn = norm(friendName)
    for (const tp of allPlayers.filter(p => p.id !== player.id)) {
      if (checkedFriends.has(tp.id)) continue
      const tl = norm(tp.last_name), tf = norm(tp.first_name)
      if ((tl.length > 2 && fn.includes(tl)) || (tf.length > 3 && fn.includes(tf))) {
        checkedFriends.add(tp.id)
        if (tp.prev_team === team.name) {
          const tpEx = getExtraction(tp.id)
          const mutual = norm(tp.special_request || '').includes(norm(player.last_name)) ||
                         tpEx.friends.some(f => norm(f).includes(norm(player.last_name)))
          total += mutual ? 4 : 2
          reasons.push(`${mutual ? 'Mutual' : 'One-way'} friend: ${tp.first_name} ${tp.last_name} (AI)`)
        } else if (!tp.prev_team && !reasons.some(r => r.includes(tp.first_name))) {
          reasons.push(`Player request: ${tp.first_name} ${tp.last_name} (no prev team)`)
        }
      }
    }
  }

  // 2. Raw string match for any players not caught by AI
  for (const tp of allPlayers.filter(p => p.id !== player.id && !checkedFriends.has(p.id))) {
    const fLast = norm(tp.last_name), fFirst = norm(tp.first_name)
    if ((fLast.length > 2 && reqNorm.includes(fLast)) || (fFirst.length > 3 && reqNorm.includes(fFirst))) {
      if (tp.prev_team === team.name) {
        const mutual = norm(tp.special_request || '').includes(norm(player.last_name))
        total += mutual ? 4 : 2
        reasons.push(`${mutual ? 'Mutual' : 'One-way'} friend: ${tp.first_name} ${tp.last_name}`)
      } else if (!tp.prev_team && !reasons.some(r => r.includes(tp.first_name))) {
        reasons.push(`Player request: ${tp.first_name} ${tp.last_name} (no prev team)`)
      }
    }
  }

  // Sibling — historical team assignments
  if (getSiblingTeams(player.account_email, player.id).includes(team.name)) {
    total += 2; reasons.push('Sibling on this team')
  }

  // Family in current 2026 registration sharing the same account email
  for (const fm of getFamily2026(player.account_email, player.id)) {
    if (fm.prev_team === team.name && !reasons.some(r => r.includes('Sibling') || r.includes('Family'))) {
      total += 2; reasons.push(`Family member ${fm.first_name} ${fm.last_name} was on this team`)
    }
  }

  // School
  if (player.school_and_grade && player.school_and_grade.length > 4) {
    const words = player.school_and_grade.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const schoolMatch = allPlayers.filter(p => p.id !== player.id && p.prev_team === team.name).some(tp =>
      words.some(w => (tp.school_and_grade || '').toLowerCase().includes(w))
    )
    if (schoolMatch) { total += 1; reasons.push('Same school as teammate') }
  }

  return { team: team.name, score: total, reasons }
}

function getSuggestions(player: Player2026, teams: Team[]): Suggestion[] {
  let candidates = [...teams]

  // Always include the player's previous team even if it's outside their age group
  // (player may have played up — let coordinator decide)
  if (player.prev_team && !candidates.some(t => t.name === player.prev_team)) {
    const prevTeam = db.prepare(
      `SELECT id, name, COALESCE(coach,'') as coach, COALESCE(birth_year,0) as birth_year FROM teams WHERE name = ? LIMIT 1`
    ).get(player.prev_team) as Team | undefined
    if (prevTeam) candidates.push(prevTeam)
  }

  const scored = candidates
    .map(t => score(player, t, players))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (scored.length) return scored

  // ── Schoolmate fallback ──────────────────────────────────────────────────────
  // When nothing else matches, find same-school same-age 2026 players with a prev_team
  const school = (player.school_and_grade || '').toLowerCase()
  const schoolWords = school.split(/\s+/).filter(w => w.length > 4)
  if (!schoolWords.length) return []

  const bYear = inferBirthYear(player)
  const schoolmateSuggestions: Suggestion[] = []

  for (const sm of players.filter(p =>
    p.id !== player.id &&
    p.gender === player.gender &&
    p.prev_team &&
    Math.abs(inferBirthYear(p) - bYear) <= 1 &&       // same age ±1 year
    schoolWords.some(w => (p.school_and_grade || '').toLowerCase().includes(w))
  )) {
    // Only suggest teams that are valid candidates for this player's age group
    if (!candidates.some(t => t.name === sm.prev_team)) continue
    const existing = schoolmateSuggestions.find(s => s.team === sm.prev_team)
    if (existing) {
      existing.reasons.push(`${sm.first_name} ${sm.last_name} (same school)`)
    } else {
      schoolmateSuggestions.push({ team: sm.prev_team, score: 1, reasons: [`${sm.first_name} ${sm.last_name} attends same school`] })
    }
  }

  return schoolmateSuggestions.sort((a, b) => b.reasons.length - a.reasons.length).slice(0, 3)
}

// Whole-word token set from a normalized string — prevents "chris" matching "christian"
function tokens(s: string): Set<string> {
  return new Set(norm(s).split(/\s+/).filter(w => w.length > 2))
}

// Returns a "place together" hint for family members or mutual friend requests with no team match
function getMutualGroupHint(player: Player2026): string {
  const together: string[] = []

  // 1. Family: same account email = same household (detected without needing a request)
  for (const fm of getFamily2026(player.account_email, player.id)) {
    together.push(`${fm.first_name} ${fm.last_name} (family)`)
  }

  // 2. Mutual AI-extracted friend requests
  const ex = getExtraction(player.id)
  for (const friendName of ex.friends) {
    const fn = norm(friendName)
    for (const tp of players.filter(p => p.id !== player.id)) {
      const tl = norm(tp.last_name), tf = norm(tp.first_name)
      if ((tl.length > 2 && fn.includes(tl)) || (tf.length > 3 && fn.includes(tf))) {
        const tpEx = getExtraction(tp.id)
        const isMutual = tpEx.friends.some(f => norm(f).includes(norm(player.last_name)))
        const alreadyListed = together.some(s => s.includes(tp.first_name))
        if (isMutual && !alreadyListed) together.push(`${tp.first_name} ${tp.last_name}`)
      }
    }
  }

  if (together.length) return `Place with ${together.join(' & ')} — same household or mutual request.`
  return ''
}

// Check if the request names a known coach outside this age group's candidate pool
function getGlobalHint(player: Player2026): string {
  const reqTokens = tokens(player.special_request || '')
  if (!reqTokens.size) return ''

  // Use AI extraction first — it already knows what's a coach vs player vs team
  const ex = getExtraction(player.id)
  if (ex.coaches.length) {
    const coachRows = db.prepare(`SELECT first_name, last_name, team_name FROM coaches`).all() as any[]
    for (const extracted of ex.coaches) {
      const en = norm(extracted)
      for (const c of coachRows) {
        const ln = norm(c.last_name), fn = norm(c.first_name)
        if (en.includes(ln) || en === `${fn} ${ln}`) {
          return `Coach ${c.first_name} ${c.last_name} found (${c.team_name}) — may not have a 2026 team yet in this age group.`
        }
      }
    }
  }

  // Fallback: whole-word match against coaches table
  const coachRows = db.prepare(`SELECT first_name, last_name, team_name FROM coaches`).all() as any[]
  for (const c of coachRows) {
    const ln = norm(c.last_name), fn = norm(c.first_name)
    if ((ln.length > 2 && reqTokens.has(ln)) || reqTokens.has(`${fn}`) && reqTokens.has(`${ln}`)) {
      return `Coach ${c.first_name} ${c.last_name} found (${c.team_name}) — may not have a 2026 team yet in this age group.`
    }
  }

  return ''
}

// ─── recommendation ──────────────────────────────────────────────────────────

function recommend(player: Player2026, suggestions: Suggestion[]): { text: string; level: string } {
  const req = (player.special_request || '').trim()
  const hasReq = req && !['n/a','na','none','-'].includes(req.toLowerCase())
  const isNew = (player.new_or_returning || '').toLowerCase().includes('new')
  const top = suggestions[0]
  if (!suggestions.length) {
    if (isNew && !hasReq) return { level: 'orange', text: 'New player, no request — assign by availability.' }
    if (hasReq) {
      const groupHint = getMutualGroupHint(player)
      if (groupHint) return { level: 'yellow', text: groupHint }
      const globalHint = getGlobalHint(player)
      return { level: 'red', text: globalHint || `Request "${req}" — no team match found. Manual lookup needed.` }
    }
    return { level: 'orange', text: 'No match. Place manually.' }
  }
  const r = top.reasons
  if (r.some(x => x.includes('Playing up')))
    return { level: 'yellow', text: `Previously on ${top.team} but age group differs — coordinator verify if playing up again.` }
  if (r.some(x => x.includes('Returning')) && top.score >= 5)
    return { level: 'green', text: `Return to ${top.team}. Same team as last year${r.some(x=>x.includes('coach'))?', confirmed by coach request':''}.` }
  if (r.some(x => x.includes('coach')) && top.score >= 5)
    return { level: 'green', text: `Assign to ${top.team}. Coach explicitly requested.` }
  if (r.some(x => x.includes('Mutual')) && top.score >= 5)
    return { level: 'green', text: `Place on ${top.team} — mutual friend group match.` }
  if (r.some(x => x.includes('Sibling')))
    return { level: 'green', text: `Assign to ${top.team} — sibling already on this team.` }
  if (isNew && r.some(x => x.includes('coach')))
    return { level: 'green', text: `New player — assign to ${top.team} per coach request.` }
  if (top.score >= 3)
    return { level: 'yellow', text: `Consider ${top.team} (score ${top.score}/10). Verify before confirming.` }
  if (r.some(x => x.toLowerCase().includes('school')))
    return { level: 'orange', text: `No direct match — schoolmate(s) were on ${top.team}. Consider placing together.` }
  return { level: 'orange', text: `Weak match (score ${top.score}/10). Coordinator review needed.` }
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function scoreBar(s: number): string {
  const pct = Math.min(100, (s / 10) * 100)
  const col = s >= 5 ? '#22c55e' : s >= 3 ? '#f59e0b' : '#94a3b8'
  return `<div class="bar-bg"><div class="bar" style="width:${pct}%;background:${col}"></div></div>`
}

// Sort by top score desc
const sorted = players.map(p => {
  const teams = getTeams(inferBirthYear(p), p.gender)
  const sugs  = getSuggestions(p, teams)
  return { p, sugs, rec: recommend(p, sugs) }
}).sort((a, b) => (b.sugs[0]?.score ?? -1) - (a.sugs[0]?.score ?? -1))

const rows = sorted.map(({ p, sugs, rec }) => {
  const hasReq = p.special_request && !['n/a','na','none','-',''].includes(p.special_request.toLowerCase().trim())
  const isNew  = (p.new_or_returning || '').toLowerCase().includes('new')

  const sugHtml = sugs.length
    ? sugs.map((s, i) => `
      <div class="sug rank-${i+1}">
        <div class="sh"><span class="sr">#${i+1}</span><span class="st">${s.team}</span><span class="ss">${s.score}pt</span>${scoreBar(s.score)}</div>
        <div class="reasons">${s.reasons.map(r => `<span class="tag">${r}</span>`).join('')}</div>
      </div>`).join('')
    : `<div class="nosug">No team match found</div>`

  return `
  <tr class="${isNew ? 'isnew' : ''}">
    <td class="cn"><div class="pname">${p.first_name} ${p.last_name}</div>
      <div class="pmeta">${p.birth_date}${isNew ? ' <span class="nbadge">NEW</span>' : ''}</div></td>
    <td class="cpkg">${p.package_name}</td>
    <td class="cprev">${p.prev_team ? `<span class="prev">${p.prev_team}</span><br><small>${p.prev_season}</small>` : '<span class="noprev">No history</span>'}</td>
    <td class="csch">${p.school_and_grade || '—'}</td>
    <td class="creq">${hasReq ? `<span class="req">${p.special_request}</span>` : '<span class="noreq">—</span>'}</td>
    <td class="csug">${sugHtml}</td>
    <td class="crec"><div class="rec rec-${rec.level}">${rec.text}</div></td>
  </tr>`
}).join('')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>EGS 2026 — Test Matching Report (${players.length} players)</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f1f5f9; color:#1e293b; padding:20px; }
  h1 { font-size:18px; color:#1e3a5f; margin-bottom:6px; }
  .sub { font-size:12px; color:#64748b; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); font-size:12px; }
  thead th { background:#1e3a5f; color:#fff; padding:10px 10px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  tr td { padding:9px 10px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#f8fafc; }
  tr.isnew td { background:#fefce8; }
  .pname { font-weight:600; }
  .pmeta { font-size:10px; color:#94a3b8; margin-top:2px; }
  .nbadge { background:#fbbf24; color:#78350f; font-size:9px; font-weight:700; padding:1px 5px; border-radius:3px; }
  .prev { color:#1d4ed8; font-size:11px; }
  .noprev { color:#cbd5e1; font-style:italic; }
  small { color:#94a3b8; font-size:10px; }
  .req { color:#059669; }
  .noreq { color:#cbd5e1; }
  .sug { margin-bottom:6px; padding:6px 8px; border-radius:5px; background:#f8fafc; border-left:3px solid #cbd5e1; }
  .sug.rank-1 { border-left-color:#22c55e; background:#f0fdf4; }
  .sug.rank-2 { border-left-color:#f59e0b; background:#fffbeb; }
  .sh { display:flex; align-items:center; gap:5px; margin-bottom:3px; }
  .sr { font-size:10px; color:#94a3b8; width:14px; font-weight:700; }
  .st { flex:1; font-weight:600; font-size:11px; }
  .ss { font-size:10px; color:#475569; width:30px; text-align:right; }
  .bar-bg { width:50px; height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden; }
  .bar { height:100%; border-radius:2px; }
  .reasons { display:flex; flex-wrap:wrap; gap:3px; }
  .tag { background:#e0f2fe; color:#0369a1; font-size:10px; padding:1px 5px; border-radius:3px; }
  .nosug { color:#f87171; font-size:11px; font-style:italic; }
  .rec { font-size:11px; line-height:1.5; padding:6px 8px; border-radius:5px; }
  .rec-green  { background:#f0fdf4; border-left:3px solid #22c55e; color:#166534; }
  .rec-yellow { background:#fffbeb; border-left:3px solid #f59e0b; color:#78350f; }
  .rec-orange { background:#fff7ed; border-left:3px solid #f97316; color:#7c2d12; }
  .rec-red    { background:#fef2f2; border-left:3px solid #ef4444; color:#7f1d1d; }
  .cpkg { width:90px; }
  .cn  { width:130px; }
  .cprev { width:170px; }
  .csch { width:140px; }
  .creq { width:160px; }
  .csug { width:220px; }
  .crec { width:200px; }
</style>
</head>
<body>
<h1>Elk Grove Soccer — 2026 Registration Test Matching</h1>
<p class="sub">${players.length} players · Sorted by match confidence (high → low) · Generated ${new Date().toLocaleDateString()}</p>
<table>
  <thead>
    <tr>
      <th>Player</th><th>Package</th><th>Prev Team</th><th>School / Grade</th>
      <th>Special Request</th><th>Suggestions</th><th>AI Recommendation</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`

const out = path.join(__dirname, 'test-2026.html')
writeFileSync(out, html)
console.log(`Report: ${out}`)
db.close()
