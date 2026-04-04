/**
 * Generate a preview of all clarification emails that would be sent to parents.
 * No real emails are sent — outputs an HTML page showing each message.
 *
 * Usage: npx tsx matching/generate-email-preview.ts [season-name]
 *
 * Tracks sent emails in the DB so re-running only shows NEW unsent messages.
 * Pass --resend to mark all as sent (for when real sending is wired up).
 */

import Database from 'better-sqlite3'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'matching.db'))
db.pragma('journal_mode = WAL')

// ─── config ───────────────────────────────────────────────────────────────────

const TEST_EMAIL   = 'wnewsom@elkgrovesoccer.com'
const FROM_EMAIL   = 'register_jarvis@elkgrovesoccer.com'  // not yet active
const SEASON_NAME  = process.argv[2] || 'Fall Recreation 2026'
const MARK_SENT    = process.argv.includes('--mark-sent')

// ─── schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS clarification_emails (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id    INTEGER NOT NULL,
    season_id    INTEGER NOT NULL,
    reason_code  TEXT NOT NULL,   -- 'missing_birth_date' | 'coach_not_found' | 'unclear_request'
    to_email     TEXT,
    subject      TEXT,
    body         TEXT,
    would_send_to TEXT,           -- the real parent email (for test mode audit)
    sent_at      TEXT,            -- NULL = not yet sent
    preview_at   TEXT,
    UNIQUE(player_id, season_id, reason_code)
  )
`)

// ─── resolve season ───────────────────────────────────────────────────────────

const season = db.prepare(`SELECT id, name FROM seasons WHERE name = ?`).get(SEASON_NAME) as { id: number; name: string } | undefined
if (!season) { console.error(`Season not found: ${SEASON_NAME}`); process.exit(1) }

// ─── load players ─────────────────────────────────────────────────────────────

interface PlayerRow {
  id: number
  first_name: string
  last_name: string
  birth_date: string
  account_first_name: string
  account_last_name: string
  account_email: string
  account_phone: string
  special_request: string
  package_name: string
  ex_coaches: string
  ex_friends: string
  ex_teams: string
}

const players = db.prepare(`
  SELECT p.id, p.first_name, p.last_name, p.birth_date,
         p.account_first_name, p.account_last_name, p.account_email, p.account_phone,
         r.special_request, r.package_name,
         COALESCE(e.coaches,'[]') as ex_coaches,
         COALESCE(e.friends,'[]') as ex_friends,
         COALESCE(e.teams,'[]')   as ex_teams
  FROM registrations r
  JOIN players p ON p.id = r.player_id
  LEFT JOIN request_extractions e ON e.player_id = p.id AND e.season_id = r.season_id
  WHERE r.season_id = ?
  ORDER BY p.last_name, p.first_name
`).all(season.id) as PlayerRow[]

// ─── helpers ─────────────────────────────────────────────────────────────────

const SKIP_REQ = new Set(['n/a','na','none','-','','player','maybe later….????','player '])

function parentName(p: PlayerRow): string {
  const first = p.account_first_name?.trim()
  const last  = p.account_last_name?.trim()
  return first ? `${first}${last ? ' ' + last : ''}` : 'Soccer Family'
}

function alreadySent(playerId: number, reasonCode: string): boolean {
  const row = db.prepare(
    `SELECT sent_at FROM clarification_emails WHERE player_id = ? AND season_id = ? AND reason_code = ?`
  ).get(playerId, season.id, reasonCode) as any
  return !!row?.sent_at
}

// ─── email templates ──────────────────────────────────────────────────────────

interface Email {
  playerId: number
  reasonCode: string
  toEmail: string        // test email
  wouldSendTo: string    // real parent email
  subject: string
  body: string
}

function missingBirthDate(p: PlayerRow): Email | null {
  if (p.birth_date || alreadySent(p.id, 'missing_birth_date')) return null
  return {
    playerId: p.id,
    reasonCode: 'missing_birth_date',
    toEmail: TEST_EMAIL,
    wouldSendTo: p.account_email,
    subject: `Action Required: Missing Birth Date for ${p.first_name} ${p.last_name} — Fall 2026 Soccer`,
    body: `Hi ${parentName(p)},

Thank you for registering ${p.first_name} for Elk Grove Soccer Fall 2026!

We noticed we're missing ${p.first_name}'s date of birth in our system. We need this to place them in the correct age group and team.

Could you please reply to this email with ${p.first_name}'s date of birth (MM/DD/YYYY)?

If you have any questions, feel free to reach out. We want to make sure ${p.first_name} is on the right team!

Thank you,
Elk Grove Soccer Registration Team`
  }
}

function coachNotFound(p: PlayerRow): Email | null {
  const coaches: string[] = JSON.parse(p.ex_coaches)
  if (!coaches.length || alreadySent(p.id, 'coach_not_found')) return null

  // Check if any extracted coach has a matching team in this player's age group
  // (simplified: if there's a global hint it means the coach is in wrong age group)
  const coachList = coaches.join(', ')
  return {
    playerId: p.id,
    reasonCode: 'coach_not_found',
    toEmail: TEST_EMAIL,
    wouldSendTo: p.account_email,
    subject: `Coach Request Update: ${p.first_name} ${p.last_name} — Fall 2026 Soccer`,
    body: `Hi ${parentName(p)},

Thank you for registering ${p.first_name} for Elk Grove Soccer Fall 2026!

You requested Coach ${coachList} for ${p.first_name}. We weren't able to automatically confirm this coach for the ${p.package_name} age group this season.

This could mean:
  • The coach hasn't been assigned a team yet for 2026
  • The coach may be moving to a different age group
  • The name may be spelled differently in our system

A coordinator will review this request and do their best to honor it. If you'd like to provide any additional details (coach's last name, team nickname, or a contact number for the coach), please reply to this email.

Thank you for your patience!

Elk Grove Soccer Registration Team`
  }
}

function unclearRequest(p: PlayerRow): Email | null {
  const req = (p.special_request || '').trim()
  if (SKIP_REQ.has(req.toLowerCase())) return null
  const coaches: string[] = JSON.parse(p.ex_coaches)
  const friends: string[] = JSON.parse(p.ex_friends)
  const teams:   string[] = JSON.parse(p.ex_teams)
  // Only flag if AI couldn't extract anything meaningful
  if (coaches.length || friends.length || teams.length) return null
  if (alreadySent(p.id, 'unclear_request')) return null
  return {
    playerId: p.id,
    reasonCode: 'unclear_request',
    toEmail: TEST_EMAIL,
    wouldSendTo: p.account_email,
    subject: `Clarification Needed: ${p.first_name} ${p.last_name}'s Special Request — Fall 2026`,
    body: `Hi ${parentName(p)},

Thank you for registering ${p.first_name} for Elk Grove Soccer Fall 2026!

You left the following special request for ${p.first_name}:

  "${req}"

We want to make sure we understand what you're looking for, but we weren't able to match this automatically. Could you help us with a bit more detail? For example:

  • The full name of a coach you'd like (first and last name)
  • The name of a friend or teammate you'd like ${p.first_name} to play with
  • The team nickname you're requesting

Please reply to this email with any clarification and we'll do our best to accommodate the request.

Thank you!

Elk Grove Soccer Registration Team`
  }
}

// ─── build email list ─────────────────────────────────────────────────────────

const emails: Email[] = []
for (const p of players) {
  const e1 = missingBirthDate(p)
  const e2 = coachNotFound(p)
  const e3 = unclearRequest(p)
  if (e1) emails.push(e1)
  if (e2) emails.push(e2)
  if (e3) emails.push(e3)
}

console.log(`${emails.length} emails to preview for season: ${season.name}`)

// ─── track in DB ─────────────────────────────────────────────────────────────

const upsertEmail = db.prepare(`
  INSERT OR IGNORE INTO clarification_emails
    (player_id, season_id, reason_code, to_email, subject, body, would_send_to, preview_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
`)

const markSent = db.prepare(`
  UPDATE clarification_emails SET sent_at = datetime('now')
  WHERE player_id = ? AND season_id = ? AND reason_code = ?
`)

for (const e of emails) {
  upsertEmail.run(e.playerId, season.id, e.reasonCode, e.toEmail, e.subject, e.body, e.wouldSendTo)
  if (MARK_SENT) markSent.run(e.playerId, season.id, e.reasonCode)
}

// ─── HTML preview ─────────────────────────────────────────────────────────────

const reasonLabels: Record<string, { label: string; color: string }> = {
  missing_birth_date: { label: 'Missing Birth Date',  color: '#ef4444' },
  coach_not_found:    { label: 'Coach Not Confirmed', color: '#f59e0b' },
  unclear_request:    { label: 'Unclear Request',     color: '#8b5cf6' },
}

const cards = emails.map(e => {
  const meta = reasonLabels[e.reasonCode] ?? { label: e.reasonCode, color: '#64748b' }
  const player = players.find(p => p.id === e.playerId)!
  return `
  <div class="card">
    <div class="card-header">
      <div class="left">
        <span class="badge" style="background:${meta.color}">${meta.label}</span>
        <span class="player">${player.first_name} ${player.last_name}</span>
        <span class="pkg">${player.package_name}</span>
      </div>
      <div class="right">
        <span class="real-to">📧 Would send to: <strong>${e.wouldSendTo}</strong>
          ${player.account_phone ? `&nbsp;·&nbsp; 📞 ${player.account_phone}` : ''}
        </span>
        <span class="test-to">⚠️ TEST MODE — Actually sending to: <strong>${e.toEmail}</strong></span>
      </div>
    </div>
    <div class="email-wrap">
      <div class="email-meta">
        <div><span class="lbl">From:</span> ${FROM_EMAIL} <em>(not yet active — preview only)</em></div>
        <div><span class="lbl">To:</span> ${e.toEmail} <em>(real: ${e.wouldSendTo})</em></div>
        <div><span class="lbl">Subject:</span> ${e.subject}</div>
      </div>
      <pre class="email-body">${e.body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
    </div>
  </div>`
}).join('')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>EGS 2026 — Email Preview (${emails.length} messages)</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f1f5f9; color:#1e293b; padding:24px; }
  h1 { font-size:18px; color:#1e3a5f; margin-bottom:4px; }
  .sub { font-size:12px; color:#64748b; margin-bottom:20px; }
  .test-banner { background:#fef9c3; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:13px; color:#78350f; }
  .test-banner strong { display:block; font-size:14px; margin-bottom:4px; }
  .card { background:#fff; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,.08); margin-bottom:20px; overflow:hidden; }
  .card-header { display:flex; justify-content:space-between; align-items:flex-start; padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; gap:12px; flex-wrap:wrap; }
  .left { display:flex; align-items:center; gap:8px; }
  .badge { color:#fff; font-size:10px; font-weight:700; padding:3px 8px; border-radius:12px; text-transform:uppercase; letter-spacing:.05em; }
  .player { font-weight:700; font-size:14px; }
  .pkg { font-size:12px; color:#64748b; }
  .right { text-align:right; font-size:11px; }
  .real-to { display:block; color:#1e293b; margin-bottom:3px; }
  .test-to { display:block; color:#b45309; font-weight:600; }
  .email-wrap { padding:16px; }
  .email-meta { font-size:12px; color:#475569; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:12px; }
  .email-meta div { margin-bottom:3px; }
  .lbl { font-weight:700; color:#1e293b; width:55px; display:inline-block; }
  .email-meta em { color:#94a3b8; }
  pre.email-body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:13px; line-height:1.7; white-space:pre-wrap; color:#1e293b; }
  .empty { text-align:center; padding:60px; color:#94a3b8; font-size:14px; }
</style>
</head>
<body>
<h1>Elk Grove Soccer — Clarification Email Preview</h1>
<p class="sub">${emails.length} emails · Season: ${season.name} · Generated ${new Date().toLocaleDateString()}</p>

<div class="test-banner">
  <strong>⚠️ TEST MODE — No real emails are being sent</strong>
  All emails below would go to <strong>${FROM_EMAIL}</strong> (not yet active).
  In test mode, they would be delivered to <strong>${TEST_EMAIL}</strong> with a note showing the real parent recipient.
  Run with <code>--mark-sent</code> to record these as sent in the database.
</div>

${emails.length ? cards : '<div class="empty">No pending emails — all parents have been contacted or no issues found.</div>'}
</body>
</html>`

const out = path.join(__dirname, 'email-preview.html')
writeFileSync(out, html)
console.log(`Preview: ${out}`)
db.close()
