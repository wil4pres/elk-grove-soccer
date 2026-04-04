/**
 * Generate static HTML matching report for coordinators.
 * Usage: npx tsx matching/generate-report.ts
 * Output: matching/report.html
 */

import Database from 'better-sqlite3'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'), { readonly: true })

// ─── types ───────────────────────────────────────────────────────────────────

interface Player {
  id: number
  first_name: string
  last_name: string
  gender: string
  birth_date: string
  account_email: string
  zip: string
  package_name: string
  school_and_grade: string
  special_request: string
  new_or_returning: string
  prev_team: string
  prev_season: string
}

interface Team {
  id: number
  name: string
  coach: string
  birth_year: number
  practice_field: string
}

interface Suggestion {
  team: string
  score: number
  reasons: string[]
}

// ─── queries ─────────────────────────────────────────────────────────────────

const PACKAGES = (db.prepare(`
  SELECT DISTINCT package_name FROM registrations
  WHERE package_name != '' ORDER BY package_name
`).all() as any[]).map(r => r.package_name as string)

function getPlayers(pkg: string): Player[] {
  return db.prepare(`
    SELECT p.id, p.first_name, p.last_name, p.gender, p.birth_date,
           p.account_email, p.zip,
           r.package_name, r.school_and_grade, r.special_request, r.new_or_returning,
           COALESCE(t.name, '') as prev_team,
           COALESCE(s2.name, '') as prev_season
    FROM registrations r
    JOIN players p ON p.id = r.player_id
    LEFT JOIN team_assignments ta ON ta.player_id = p.id
      AND ta.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2024' LIMIT 1)
    LEFT JOIN teams t ON t.id = ta.team_id
    LEFT JOIN seasons s2 ON s2.id = ta.season_id
    WHERE r.season_id = (SELECT id FROM seasons WHERE name = 'Fall Recreation 2025' LIMIT 1)
      AND r.package_name = ?
    ORDER BY p.last_name, p.first_name
  `).all(pkg) as Player[]
}

function getTeams(pkg: string): Team[] {
  const yearMatch = pkg.match(/(\d{4})/)
  if (!yearMatch) return []
  const year     = yearMatch[1]
  const gCode    = pkg.includes('Girls') ? 'G' : 'B'
  const uAge     = 2026 - parseInt(year)
  // Two naming conventions: "2016G Butterflies (Bravo)" and "Elk Grove Soccer U16G Firestorm (Costa)"
  return db.prepare(`
    SELECT t.id, t.name, COALESCE(t.coach,'') as coach, COALESCE(t.birth_year, 0) as birth_year,
           COALESCE(t.practice_field,'') as practice_field
    FROM teams t
    WHERE t.name LIKE ? OR t.name LIKE ? OR t.name LIKE ?
    GROUP BY t.name
    ORDER BY t.name
  `).all(`${year}${gCode}%`, `%U${uAge}${gCode}%`, `%U${uAge} ${gCode}%`) as Team[]
}

function getSiblingTeams(accountEmail: string, playerId: number): string[] {
  if (!accountEmail) return []
  const rows = db.prepare(`
    SELECT DISTINCT t.name
    FROM players p
    JOIN team_assignments ta ON ta.player_id = p.id
      AND ta.season_id = (SELECT id FROM seasons WHERE name LIKE '%2025%' LIMIT 1)
    JOIN teams t ON t.id = ta.team_id
    WHERE p.account_email = ? AND p.id != ?
  `).all(accountEmail, playerId) as any[]
  return rows.map(r => r.name)
}

// ─── scoring ──────────────────────────────────────────────────────────────────

// Build a lookup: team_name → coaches from the coaches table (all seasons)
function getCoachesForTeam(teamName: string): { first: string; last: string; role: string }[] {
  return db.prepare(`
    SELECT first_name as first, last_name as last, role
    FROM coaches WHERE team_name = ? COLLATE NOCASE
  `).all(teamName) as any[]
}

// Returns the distance rank (1 = closest) of a given field for a player.
// Returns null if distance data isn't available (geocoding not yet run).
const proximityRankCache = new Map<string, number | null>()
function getFieldProximityRank(playerId: number, fieldName: string): number | null {
  if (!fieldName) return null
  const cacheKey = `${playerId}:${fieldName}`
  if (proximityRankCache.has(cacheKey)) return proximityRankCache.get(cacheKey)!

  try {
    const row = db.prepare(`
      SELECT ranked.rank FROM (
        SELECT field_name,
               ROW_NUMBER() OVER (ORDER BY drive_meters ASC) AS rank
        FROM field_distances
        WHERE player_id = ?
      ) AS ranked
      WHERE ranked.field_name = ?
    `).get(playerId, fieldName) as { rank: number } | undefined

    const result = row?.rank ?? null
    proximityRankCache.set(cacheKey, result)
    return result
  } catch {
    // field_distances table doesn't exist yet — distances not calculated
    return null
  }
}

// Normalize for fuzzy matching: lowercase, strip apostrophes/hyphens/dots
function norm(s: string): string {
  return s.toLowerCase().replace(/['\u2019\-\.]/g, '')
}

function score(player: Player, team: Team, allPlayers: Player[]): Suggestion {
  const reasons: string[] = []
  let total = 0
  const req     = (player.special_request || '').toLowerCase()
  const reqNorm = norm(player.special_request || '')

  // +3 previous team match
  if (player.prev_team && player.prev_team === team.name) {
    total += 3
    reasons.push('Returning to same team')
    // Detect playing up/down: team birth year differs from player birth year
    const playerBY = parseInt(player.birth_date?.slice(0, 4) ?? '0')
    const teamYear = team.birth_year && team.birth_year > 0 ? team.birth_year
                   : parseInt(team.name.match(/(20\d{2})[BG]/)?.[1] ?? '0')
    if (teamYear && playerBY && teamYear !== playerBY) {
      reasons.push(`Playing up/down (born ${playerBY}, team ${teamYear}) — coordinator verify`)
    }
  }

  // +3 coach name match — check coaches table (first name, last name, full name)
  const coaches = getCoachesForTeam(team.name)
  for (const c of coaches) {
    const lastName  = norm(c.last)
    const firstName = norm(c.first)
    const fullName  = `${firstName} ${lastName}`
    if (
      (lastName.length > 2  && reqNorm.includes(lastName))  ||
      (firstName.length > 3 && reqNorm.includes(firstName)) ||
      reqNorm.includes(fullName)
    ) {
      total += 3
      reasons.push(`Requested coach "${c.first} ${c.last}"`)
      break  // only count once per team
    }
  }

  // Also check the coach parsed from team name as fallback
  if (!reasons.some(r => r.includes('Requested coach')) && team.coach) {
    if (team.coach.length > 2 && reqNorm.includes(norm(team.coach))) {
      total += 3
      reasons.push(`Requested coach "${team.coach}"`)
    }
  }

  // +2 team nickname — capture full multi-word names like "Pink Panthers", "Blue Cheetahs"
  // Handles both "2016G Butterflies (Coach)" and "Elk Grove Soccer U16G Firestorm (Coach)"
  const nickMatch = team.name.match(/\d{4}[BG]\s+(.+?)\s+\(/) || team.name.match(/U\d+\s*[BG]\s+(.+?)\s+\(/)
  if (nickMatch) {
    const nickLower = nickMatch[1].toLowerCase()
    const nickWords = nickLower.split(/\s+/).filter(w => w.length > 4)
    if (req.includes(nickLower) || nickWords.some(w => req.includes(w))) {
      total += 2
      reasons.push(`Requested team "${nickMatch[1]}"`)
    }
  }

  // +2 / +4 friend / player request — scan ALL registrants by name (coaches, teams, OR players)
  const teamPlayers = allPlayers.filter(p => p.id !== player.id && p.prev_team === team.name)
  for (const tp of allPlayers.filter(p => p.id !== player.id)) {
    const fLast  = norm(tp.last_name), fFirst = norm(tp.first_name)
    if ((fLast.length > 2 && reqNorm.includes(fLast)) || (fFirst.length > 3 && reqNorm.includes(fFirst))) {
      if (tp.prev_team === team.name) {
        const isMutual = norm(tp.special_request || '').includes(norm(player.last_name))
        total += isMutual ? 4 : 2
        reasons.push(`${isMutual ? 'Mutual' : 'One-way'} friend: ${tp.first_name} ${tp.last_name}`)
      } else if (!tp.prev_team && !reasons.some(r => r.includes(tp.first_name))) {
        reasons.push(`Player request: ${tp.first_name} ${tp.last_name} (no prev team)`)
      }
    }
  }

  // +2 sibling on team
  const siblingTeams = getSiblingTeams(player.account_email, player.id)
  if (siblingTeams.includes(team.name)) {
    total += 2
    reasons.push('Sibling on this team')
  }

  // +2/+1 closest practice field — road-network distance, acts as tiebreaker
  // before school when no stronger signals match (age+gender already guaranteed)
  if (team.practice_field) {
    const rank = getFieldProximityRank(player.id, team.practice_field)
    if (rank === 1) {
      total += 2
      reasons.push(`Closest field: ${team.practice_field}`)
    } else if (rank === 2) {
      total += 1
      reasons.push(`2nd closest field: ${team.practice_field}`)
    }
  }

  // +1 same school (check if any team player shares school keyword)
  if (player.school_and_grade && player.school_and_grade.length > 4) {
    const schoolWords = player.school_and_grade.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const teamSchoolPlayers = teamPlayers.filter(tp => {
      const tpSchool = (tp.school_and_grade || '').toLowerCase()
      return schoolWords.some(w => tpSchool.includes(w))
    })
    if (teamSchoolPlayers.length > 0) {
      total += 1
      reasons.push(`Same school as ${teamSchoolPlayers.length} teammate(s)`)
    }
  }

  return { team: team.name, score: total, reasons }
}

function getSuggestions(player: Player, teams: Team[], allPlayers: Player[]): Suggestion[] {
  let candidates = [...teams]

  // Always include the player's previous team even if outside their age group
  // (player may have played up — let coordinator decide)
  if (player.prev_team && !candidates.some(t => t.name === player.prev_team)) {
    const prevTeam = db.prepare(
      `SELECT id, name, COALESCE(coach,'') as coach, COALESCE(birth_year,0) as birth_year FROM teams WHERE name = ? LIMIT 1`
    ).get(player.prev_team) as Team | undefined
    if (prevTeam) candidates.push(prevTeam)
  }

  return candidates
    .map(t => score(player, t, allPlayers))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

// ─── AI recommendation ───────────────────────────────────────────────────────

function recommend(player: Player, suggestions: Suggestion[], allPlayers: Player[]): { text: string; level: 'green' | 'yellow' | 'orange' | 'red' } {
  const req = (player.special_request || '').trim()
  const hasReq = req && !['n/a','na','none','-'].includes(req.toLowerCase())
  const top = suggestions[0]
  const isNew = (player.new_or_returning || '').toLowerCase().includes('new')

  // No suggestions at all
  if (!suggestions.length) {
    if (isNew && !hasReq)
      return { level: 'orange', text: 'New player with no request — assign based on school/zip or coordinator preference.' }
    if (hasReq)
      return { level: 'red', text: `Request "${req}" could not be matched to a known team or coach. Manual lookup required.` }
    return { level: 'orange', text: 'No match found. Place manually based on availability.' }
  }

  const reasons = top.reasons
  const hasPlayingUp = reasons.some(r => r.includes('Playing up'))
  const hasPrevTeam = reasons.some(r => r.includes('Returning'))
  const hasCoachReq = reasons.some(r => r.includes('Requested coach'))
  const hasTeamReq  = reasons.some(r => r.includes('Requested team'))
  const hasMutual   = reasons.some(r => r.includes('Mutual friend'))
  const hasOneway   = reasons.some(r => r.includes('One-way friend'))
  const hasSibling  = reasons.some(r => r.includes('Sibling'))
  const hasSchool   = reasons.some(r => r.includes('school'))

  // Playing up/down: prev team is a different age bracket — let coordinator decide
  if (hasPlayingUp)
    return { level: 'yellow', text: `Previously on ${top.team} but age group differs — coordinator verify if playing up again.` }

  // Conflict: explicit request points somewhere different from prev team
  if (hasPrevTeam && hasReq && !hasCoachReq && !hasTeamReq) {
    const prevTeamName = player.prev_team
    return { level: 'yellow', text: `Was on ${prevTeamName} last year but has a new request ("${req}"). Confirm with family before reassigning.` }
  }

  // Strong: returning + coach/team request aligned
  if (top.score >= 6 && hasPrevTeam && (hasCoachReq || hasTeamReq)) {
    return { level: 'green', text: `Assign to ${top.team}. Returning player who also requested this coach/team — strong alignment.` }
  }

  // Strong: returning, no conflicting request
  if (top.score >= 5 && hasPrevTeam && !hasReq) {
    return { level: 'green', text: `Return to ${top.team}. Same team as last year, no change requested.` }
  }

  // Strong: explicit coach/team request matched
  if (top.score >= 5 && (hasCoachReq || hasTeamReq)) {
    return { level: 'green', text: `Assign to ${top.team}. Player explicitly requested this ${hasCoachReq ? 'coach' : 'team'}.` }
  }

  // Strong: mutual friend group
  if (top.score >= 5 && hasMutual) {
    const mutualCount = reasons.filter(r => r.includes('Mutual')).length
    return { level: 'green', text: `Place on ${top.team}. Part of a mutual friend group (${mutualCount} mutual request${mutualCount > 1 ? 's' : ''}).` }
  }

  // Sibling match
  if (hasSibling) {
    return { level: 'green', text: `Assign to ${top.team}. Sibling already on this team — keep family together.` }
  }

  // Medium: one-way friend or school match
  if (top.score >= 3 && (hasOneway || hasSchool)) {
    const detail = hasOneway ? 'friend request' : 'shared school'
    return { level: 'yellow', text: `Consider ${top.team} based on ${detail}. Score ${top.score}/10 — verify with coordinator.` }
  }

  // New player with coach/team request
  if (isNew && hasReq && (hasCoachReq || hasTeamReq)) {
    return { level: 'green', text: `New player — assign to ${top.team} per their request.` }
  }

  // New player, no strong signal
  if (isNew) {
    return { level: 'yellow', text: `New player. Best available match is ${top.team} (score ${top.score}/10). Coordinator should confirm.` }
  }

  // Weak match
  if (top.score <= 2) {
    return { level: 'orange', text: `Weak signals only (score ${top.score}/10). Best guess: ${top.team}. Recommend coordinator review.` }
  }

  return { level: 'yellow', text: `Suggest ${top.team} (score ${top.score}/10). Review reasons before confirming.` }
}

// ─── HTML generation ──────────────────────────────────────────────────────────

function scoreBar(score: number): string {
  const max = 10
  const pct = Math.min(100, (score / max) * 100)
  const color = score >= 5 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#94a3b8'
  return `<div class="score-bar-bg"><div class="score-bar" style="width:${pct}%;background:${color}"></div></div>`
}

function renderPackage(pkg: string): string {
  const players = getPlayers(pkg)
  const teams = getTeams(pkg)

  if (!players.length) return `<p class="empty">No registrations found for ${pkg}.</p>`

  // Sort players: highest top-suggestion score first, unmatched at the bottom
  const scoredPlayers = players.map(player => ({
    player,
    suggestions: getSuggestions(player, teams, players),
  }))
  scoredPlayers.sort((a, b) => {
    const scoreA = a.suggestions[0]?.score ?? -1
    const scoreB = b.suggestions[0]?.score ?? -1
    return scoreB - scoreA
  })

  const rows = scoredPlayers.map(({ player, suggestions }) => {
    const isNew     = (player.new_or_returning || '').toLowerCase().includes('new')
    const hasRequest = player.special_request && !['n/a','na','none','-',''].includes(player.special_request.toLowerCase().trim())
    const rec        = recommend(player, suggestions, players)

    const suggestionsHtml = suggestions.length
      ? suggestions.map((s, i) => `
        <div class="suggestion rank-${i+1}">
          <div class="sug-header">
            <span class="sug-rank">#${i+1}</span>
            <span class="sug-team">${s.team}</span>
            <span class="sug-score">${s.score} pts</span>
            ${scoreBar(s.score)}
          </div>
          <div class="sug-reasons">${s.reasons.map(r => `<span class="reason">${r}</span>`).join('')}</div>
        </div>`).join('')
      : `<div class="no-suggestion">No strong match — manual review needed</div>`

    return `
      <tr class="player-row ${isNew ? 'new-player' : ''}">
        <td class="col-name">
          <div class="player-name">${player.first_name} ${player.last_name}</div>
          <div class="player-meta">${player.birth_date || ''}${isNew ? ' <span class="badge-new">NEW</span>' : ''}</div>
        </td>
        <td class="col-prev">${player.prev_team
          ? `<span class="prev-team">${player.prev_team}</span>`
          : '<span class="no-prev">No history</span>'}</td>
        <td class="col-school">${player.school_and_grade || '—'}</td>
        <td class="col-request">${hasRequest
          ? `<span class="special-req">${player.special_request}</span>`
          : '<span class="no-req">—</span>'}</td>
        <td class="col-suggestions">${suggestionsHtml}</td>
        <td class="col-rec"><div class="rec rec-${rec.level}">${rec.text}</div></td>
      </tr>`
  }).join('')

  const withSuggestions = scoredPlayers.filter(s => s.suggestions.length > 0).length

  return `
    <div class="pkg-stats">
      <span class="stat">${players.length} players</span>
      <span class="stat">${players.filter(p => p.prev_team).length} returning</span>
      <span class="stat">${players.filter(p => (p.special_request||'').trim() && !['n/a','na','none','-'].includes((p.special_request||'').toLowerCase().trim())).length} with requests</span>
      <span class="stat highlight">${withSuggestions} matched</span>
      <span class="stat warn">${players.length - withSuggestions} need review</span>
    </div>
    <table class="player-table">
      <thead>
        <tr>
          <th class="col-name">Player</th>
          <th class="col-prev">2024 Team</th>
          <th class="col-school">School / Grade</th>
          <th class="col-request">Special Request</th>
          <th class="col-suggestions">Suggestions</th>
          <th class="col-rec">AI Recommendation</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

// ─── build full HTML ──────────────────────────────────────────────────────────

console.log('Building report...')

const tabButtons = PACKAGES.map((pkg, i) => {
  const [year, gender] = pkg.split(' ')
  return `<button class="tab-btn ${i === 0 ? 'active' : ''}" onclick="showTab('${pkg}')" id="btn-${pkg.replace(' ','-')}">${year}<br><span class="gender-label">${gender}</span></button>`
}).join('')

const tabContents = PACKAGES.map((pkg, i) => {
  console.log(`  Processing ${pkg}...`)
  return `<div class="tab-content ${i === 0 ? 'active' : ''}" id="tab-${pkg.replace(' ','-')}">${renderPackage(pkg)}</div>`
}).join('')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Elk Grove Soccer — Team Matching Report 2025</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; display: flex; height: 100vh; overflow: hidden; }

  /* Sidebar */
  #sidebar {
    width: 90px; background: #1e3a5f; display: flex; flex-direction: column;
    overflow-y: auto; flex-shrink: 0;
  }
  #sidebar h1 { color: #fff; font-size: 10px; text-align: center; padding: 12px 6px 8px; border-bottom: 1px solid #2d5a8e; line-height: 1.4; }
  .tab-btn {
    background: none; border: none; color: #94b8d8; cursor: pointer;
    padding: 10px 4px; font-size: 13px; font-weight: 600; text-align: center;
    border-left: 3px solid transparent; transition: all 0.15s; line-height: 1.2;
  }
  .tab-btn:hover { background: #2d5a8e; color: #fff; }
  .tab-btn.active { background: #2d5a8e; color: #fff; border-left-color: #38bdf8; }
  .gender-label { font-size: 10px; font-weight: 400; opacity: 0.8; }

  /* Main */
  #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  #header { background: #1e3a5f; color: white; padding: 14px 20px; display: flex; align-items: center; gap: 12px; }
  #header h2 { font-size: 16px; }
  #header span { font-size: 12px; opacity: 0.7; }
  #content { flex: 1; overflow-y: auto; padding: 16px; }

  /* Tab content */
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Stats bar */
  .pkg-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
  .stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px 12px; font-size: 12px; color: #475569; }
  .stat.highlight { background: #dcfce7; border-color: #86efac; color: #166534; font-weight: 600; }
  .stat.warn { background: #fef9c3; border-color: #fde047; color: #713f12; }

  /* Table */
  .player-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-size: 13px; }
  .player-table thead th { background: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
  .player-row td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .player-row:last-child td { border-bottom: none; }
  .player-row:hover td { background: #f8fafc; }
  .player-row.new-player td { background: #fefce8; }
  .player-row.new-player:hover td { background: #fef9c3; }

  /* Column widths */
  .col-name { width: 140px; }
  .col-prev { width: 160px; }
  .col-school { width: 150px; }
  .col-request { width: 180px; }
  .col-suggestions { width: auto; }

  /* Player info */
  .player-name { font-weight: 600; color: #1e293b; }
  .player-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .badge-new { background: #fbbf24; color: #78350f; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; }
  .prev-team { font-size: 12px; color: #1d4ed8; }
  .no-prev { color: #94a3b8; font-size: 12px; font-style: italic; }
  .special-req { font-size: 12px; color: #059669; }
  .no-req { color: #cbd5e1; }

  /* Suggestions */
  .suggestion { margin-bottom: 8px; background: #f8fafc; border-radius: 6px; padding: 7px 10px; border-left: 3px solid #cbd5e1; }
  .suggestion.rank-1 { border-left-color: #22c55e; background: #f0fdf4; }
  .suggestion.rank-2 { border-left-color: #f59e0b; background: #fffbeb; }
  .suggestion.rank-3 { border-left-color: #94a3b8; }
  .sug-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .sug-rank { font-size: 10px; font-weight: 700; color: #94a3b8; width: 16px; }
  .sug-team { font-size: 12px; font-weight: 600; flex: 1; color: #1e293b; }
  .sug-score { font-size: 11px; font-weight: 700; color: #475569; width: 36px; text-align: right; }
  .score-bar-bg { height: 4px; width: 60px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
  .score-bar { height: 100%; border-radius: 2px; transition: width 0.3s; }
  .sug-reasons { display: flex; flex-wrap: wrap; gap: 4px; }
  .reason { background: #e0f2fe; color: #0369a1; font-size: 10px; padding: 2px 6px; border-radius: 3px; }
  .no-suggestion { color: #f87171; font-size: 12px; font-style: italic; padding: 4px 0; }
  .empty { color: #94a3b8; font-style: italic; padding: 20px; }

  /* AI Recommendation column */
  .col-rec { width: 220px; }
  .rec { font-size: 12px; line-height: 1.5; padding: 8px 10px; border-radius: 6px; }
  .rec-green  { background: #f0fdf4; border-left: 3px solid #22c55e; color: #166534; }
  .rec-yellow { background: #fffbeb; border-left: 3px solid #f59e0b; color: #78350f; }
  .rec-orange { background: #fff7ed; border-left: 3px solid #f97316; color: #7c2d12; }
  .rec-red    { background: #fef2f2; border-left: 3px solid #ef4444; color: #7f1d1d; }
</style>
</head>
<body>
<div id="sidebar">
  <h1>EGS<br>Matching<br>2025</h1>
  ${tabButtons}
</div>
<div id="main">
  <div id="header">
    <h2 id="current-tab-title">2007 Boys</h2>
    <span>Elk Grove Soccer — Team Assignment Suggestions</span>
  </div>
  <div id="content">
    ${tabContents}
  </div>
</div>
<script>
  function showTab(pkg) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'))
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'))
    const id = pkg.replace(' ', '-')
    document.getElementById('tab-' + id).classList.add('active')
    document.getElementById('btn-' + id).classList.add('active')
    document.getElementById('current-tab-title').textContent = pkg
  }
</script>
</body>
</html>`

const outPath = path.join(__dirname, 'report.html')
writeFileSync(outPath, html)
console.log(`\nReport written to: ${outPath}`)
db.close()
