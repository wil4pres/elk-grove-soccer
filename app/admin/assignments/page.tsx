'use client'

import { useCallback, useEffect, useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────────

type Confidence = 'green' | 'yellow' | 'red'
type ViewTab = 'assignments' | 'unassigned' | 'teams'

interface AssignmentRow {
  player_id: string
  player_name: string
  package_name: string
  assigned_team_id: string
  assigned_team_name: string
  score: number
  signals: string[]
  confidence: Confidence
  assigned_by: 'grand_assignment' | 'coordinator_override'
  override_approved?: boolean
  timestamp: string
}

interface UnassignedRow {
  player_id: string
  player_name: string
  package_name: string
  reason: string
  best_team?: string
  best_score?: number
}

interface TeamSummary {
  team_id: string
  team_name: string
  birth_year: string
  gender: string
  assigned_count: number
  preferred: number
  max: number
  overflow_approved: number
}

interface ReportStats {
  total_players: number
  assigned: number
  unassigned: number
  green: number
  yellow: number
  red: number
}

interface GrandAssignmentReport {
  season: string
  assignments: AssignmentRow[]
  unassigned: UnassignedRow[]
  teamSummary: TeamSummary[]
  stats: ReportStats
  generatedAt: string
}

interface NotificationRecord {
  notificationId: string
  player_id: string
  player_name: string
  intended_recipient_email: string
  intended_recipient_name: string
  actual_recipient_email: string
  assigned_team_name: string
  subject: string
  status: 'queued' | 'sent' | 'failed'
  resend_id?: string
  error?: string
  sent_at?: string
  created_at: string
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const [report, setReport] = useState<GrandAssignmentReport | null>(null)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingPlayerIds, setSendingPlayerIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [sendResult, setSendResult] = useState('')
  const [viewTab, setViewTab] = useState<ViewTab>('assignments')
  const [filterPkg, setFilterPkg] = useState<string | null>(null)
  const [filterConfidence, setFilterConfidence] = useState<Confidence | null>(null)
  const [emailLogPlayer, setEmailLogPlayer] = useState<{ id: string; name: string } | null>(null)

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/send-assignment-emails')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch { /* silent */ }
  }, [])

  const loadReport = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/grand-assignment')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setReport(data.report)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport()
    loadNotifications()
  }, [loadReport, loadNotifications])

  // Set of player_ids that have had emails sent
  const sentPlayerIds = new Set(
    notifications.filter(n => n.status === 'sent').map(n => n.player_id)
  )

  async function runAssignment() {
    setRunning(true)
    setError('')
    try {
      const res = await fetch('/api/admin/grand-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setReport(data.report)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  async function rerunAssignment() {
    setRunning(true)
    setError('')
    try {
      const res = await fetch('/api/admin/grand-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rerun' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setReport(data.report)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  async function sendAllEmails() {
    if (!confirm('Send assignment emails for ALL players? All go to wnewsom@elkgrovesoccer.com (test mode).')) return
    setSending(true)
    setSendResult('')
    setError('')
    try {
      const res = await fetch('/api/admin/send-assignment-emails', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSendResult(data.message)
      await loadNotifications()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  async function sendPlayerEmail(playerId: string) {
    setSendingPlayerIds(prev => new Set(prev).add(playerId))
    try {
      const res = await fetch('/api/admin/send-assignment-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: [playerId] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      await loadNotifications()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSendingPlayerIds(prev => { const s = new Set(prev); s.delete(playerId); return s })
    }
  }

  async function approveOverflow(playerId: string) {
    try {
      const res = await fetch('/api/admin/grand-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_overflow', playerId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await rerunAssignment()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const packages = report
    ? [...new Set(report.assignments.map(a => a.package_name))].sort()
    : []

  let filteredAssignments = report?.assignments ?? []
  if (filterPkg) filteredAssignments = filteredAssignments.filter(a => a.package_name === filterPkg)
  if (filterConfidence) filteredAssignments = filteredAssignments.filter(a => a.confidence === filterConfidence)

  let filteredUnassigned = report?.unassigned ?? []
  if (filterPkg) filteredUnassigned = filteredUnassigned.filter(u => u.package_name === filterPkg)

  const playerEmailLog = emailLogPlayer
    ? notifications.filter(n => n.player_id === emailLogPlayer.id)
    : []

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading assignment report...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grand Assignment Report</h1>
          <p className="text-gray-500 mt-1">
            Spring 2026 — One-click full-season team assignment
            {report?.generatedAt && (
              <span className="ml-2 text-xs text-gray-400">
                Last run: {new Date(report.generatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <>
              <button
                onClick={sendAllEmails}
                disabled={sending || running}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending...' : '✉ Send All Emails'}
              </button>
              <button
                onClick={rerunAssignment}
                disabled={running}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {running ? 'Re-running...' : 'Re-run (keep overrides)'}
              </button>
            </>
          )}
          <button
            onClick={runAssignment}
            disabled={running}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running...
              </span>
            ) : report ? 'Run Fresh Assignment' : 'Run Grand Assignment'}
          </button>
        </div>
      </div>

      {sendResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-800 text-sm font-medium">{sendResult}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* No report yet */}
      {!report && !error && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h2 className="text-lg font-bold text-gray-800 mb-2">No Assignment Report Yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Click "Run Grand Assignment" to score every player against every eligible team
            and produce a global, constraint-aware assignment in one pass.
          </p>
          <div className="text-left max-w-md mx-auto text-sm text-gray-500 space-y-1.5">
            <p>The algorithm will:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Score every player against every eligible team</li>
              <li>Sort all player-team pairs by score (strongest first)</li>
              <li>Greedily assign — skip full teams</li>
              <li>Classify confidence: green / yellow / red</li>
            </ol>
          </div>
        </div>
      )}

      {/* Report content */}
      {report && (
        <>
          {/* Stats strip */}
          <div className="flex flex-wrap gap-2 mb-4">
            <StatBadge label={`${report.stats.total_players} total`} />
            <StatBadge label={`${report.stats.assigned} assigned`} variant="green" />
            <StatBadge label={`${report.stats.unassigned} unassigned`} variant={report.stats.unassigned > 0 ? 'red' : undefined} />
            <StatBadge label={`${sentPlayerIds.size} emailed`} variant={sentPlayerIds.size > 0 ? 'blue' : undefined} />
            <span className="border-l border-gray-300 mx-1" />
            <ConfBadge confidence="green" count={report.stats.green} onClick={() => setFilterConfidence(filterConfidence === 'green' ? null : 'green')} active={filterConfidence === 'green'} />
            <ConfBadge confidence="yellow" count={report.stats.yellow} onClick={() => setFilterConfidence(filterConfidence === 'yellow' ? null : 'yellow')} active={filterConfidence === 'yellow'} />
            <ConfBadge confidence="red" count={report.stats.red} onClick={() => setFilterConfidence(filterConfidence === 'red' ? null : 'red')} active={filterConfidence === 'red'} />
          </div>

          {/* View tabs + package filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-1">
              {(['assignments', 'unassigned', 'teams'] as ViewTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setViewTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    viewTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab}
                  {tab === 'unassigned' && report.stats.unassigned > 0 && (
                    <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{report.stats.unassigned}</span>
                  )}
                </button>
              ))}
            </div>

            {viewTab !== 'teams' && (
              <select
                value={filterPkg ?? ''}
                onChange={e => setFilterPkg(e.target.value || null)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700"
              >
                <option value="">All packages</option>
                {packages.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}

            {(filterPkg || filterConfidence) && (
              <button
                onClick={() => { setFilterPkg(null); setFilterConfidence(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Assignments table */}
          {viewTab === 'assignments' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold w-8"></th>
                    <th className="px-4 py-3 text-left font-semibold">Player</th>
                    <th className="px-4 py-3 text-left font-semibold">Package</th>
                    <th className="px-4 py-3 text-left font-semibold">Assigned Team</th>
                    <th className="px-4 py-3 text-left font-semibold">Score</th>
                    <th className="px-4 py-3 text-left font-semibold">Signals</th>
                    <th className="px-4 py-3 text-left font-semibold w-20">By</th>
                    <th className="px-4 py-3 text-left font-semibold w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(a => (
                    <AssignmentTableRow
                      key={a.player_id}
                      row={a}
                      isSent={sentPlayerIds.has(a.player_id)}
                      isSending={sendingPlayerIds.has(a.player_id)}
                      onAssign={() => sendPlayerEmail(a.player_id)}
                      onViewLog={() => setEmailLogPlayer({ id: a.player_id, name: a.player_name })}
                    />
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">
                        No assignments match current filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Unassigned table */}
          {viewTab === 'unassigned' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              {filteredUnassigned.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  All players have been assigned!
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-semibold">Player</th>
                      <th className="px-4 py-3 text-left font-semibold">Package</th>
                      <th className="px-4 py-3 text-left font-semibold">Reason</th>
                      <th className="px-4 py-3 text-left font-semibold">Best Match</th>
                      <th className="px-4 py-3 text-left font-semibold w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnassigned.map(u => (
                      <tr key={u.player_id} className="border-t border-gray-100 hover:bg-red-50/30">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.player_name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{u.package_name}</td>
                        <td className="px-4 py-3 text-red-600 text-xs">{u.reason}</td>
                        <td className="px-4 py-3">
                          {u.best_team ? (
                            <span className="text-xs text-gray-700">
                              {u.best_team} <span className="text-gray-400">(score {u.best_score})</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.best_team && (
                            <button
                              onClick={() => approveOverflow(u.player_id)}
                              className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                            >
                              Approve +1
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Teams summary */}
          {viewTab === 'teams' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold">Team</th>
                    <th className="px-4 py-3 text-left font-semibold">Age / Gender</th>
                    <th className="px-4 py-3 text-center font-semibold">Assigned</th>
                    <th className="px-4 py-3 text-center font-semibold">Preferred</th>
                    <th className="px-4 py-3 text-center font-semibold">Max</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.teamSummary.map(t => {
                    const pct = t.preferred > 0 ? (t.assigned_count / t.preferred) * 100 : 0
                    const isFull = t.assigned_count >= t.max
                    const isNearLimit = !isFull && t.assigned_count >= t.preferred
                    return (
                      <tr key={t.team_id} className={`border-t border-gray-100 ${isFull ? 'bg-red-50/30' : isNearLimit ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{t.team_name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {t.birth_year} {t.gender === 'Male' || t.gender === 'B' ? 'Boys' : 'Girls'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{t.assigned_count}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{t.preferred}</td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {t.max}
                          {t.overflow_approved > 0 && (
                            <span className="text-amber-600 font-medium"> +{t.overflow_approved}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isFull ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            {isFull && <span className="text-[10px] font-bold text-red-600 uppercase">Full</span>}
                            {isNearLimit && !isFull && <span className="text-[10px] font-medium text-amber-600">Near limit</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Email Log Modal */}
      {emailLogPlayer && (
        <EmailLogModal
          playerName={emailLogPlayer.name}
          logs={playerEmailLog}
          onClose={() => setEmailLogPlayer(null)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StatBadge({ label, variant }: { label: string; variant?: 'green' | 'red' | 'blue' }) {
  const cls =
    variant === 'green' ? 'bg-green-50 border-green-300 text-green-800 font-semibold' :
    variant === 'red'   ? 'bg-red-50 border-red-300 text-red-800 font-semibold' :
    variant === 'blue'  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold' :
    'bg-white border-gray-200 text-gray-500'
  return <span className={`border rounded-md px-3 py-1.5 text-xs ${cls}`}>{label}</span>
}

function ConfBadge({
  confidence, count, onClick, active,
}: {
  confidence: Confidence; count: number; onClick: () => void; active: boolean
}) {
  const emoji = confidence === 'green' ? '🟢' : confidence === 'yellow' ? '🟡' : '🔴'
  const label = confidence === 'green' ? 'Strong' : confidence === 'yellow' ? 'Moderate' : 'Weak'
  return (
    <button
      onClick={onClick}
      className={`border rounded-md px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {emoji} {count} {label}
    </button>
  )
}

// Parses signals that contain encoded teammate refs: "...as teammates [id1:Name1|id2:Name2]"
// Returns an array of React nodes (plain text or links).
function renderSignal(signal: string): React.ReactNode {
  const match = signal.match(/^(.*) as teammates \[(.+)\]$/)
  if (!match) return signal
  const prefix = match[1]
  const refs = match[2].split('|').map(ref => {
    const colonIdx = ref.indexOf(':')
    return { id: ref.slice(0, colonIdx), name: ref.slice(colonIdx + 1) }
  })
  return (
    <>
      {prefix} as{' '}
      {refs.map((ref, i) => (
        <span key={ref.id}>
          {i > 0 && ', '}
          <a
            href={`#${ref.id}`}
            className="underline text-blue-700 hover:text-blue-900"
            onClick={e => e.stopPropagation()}
          >
            {ref.name}
          </a>
        </span>
      ))}
    </>
  )
}

function AssignmentTableRow({
  row, isSent, isSending, onAssign, onViewLog,
}: {
  row: AssignmentRow
  isSent: boolean
  isSending: boolean
  onAssign: () => void
  onViewLog: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const confColor = {
    green: 'bg-green-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
  }[row.confidence]

  const confLabel = {
    green: 'Strong',
    yellow: 'Moderate',
    red: 'AI guess — verify',
  }[row.confidence]

  const scorePct = Math.min(100, (row.score / 10) * 100)
  const scoreBarColor = row.score >= 5 ? 'bg-green-500' : row.score >= 3 ? 'bg-amber-500' : 'bg-gray-400'

  return (
    <tr
      id={row.player_id}
      className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${row.confidence === 'red' ? 'bg-red-50/30' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Confidence dot */}
      <td className="px-4 py-3">
        <div className={`w-3 h-3 rounded-full ${confColor}`} title={confLabel} />
      </td>

      {/* Player */}
      <td className="px-4 py-3">
        <span className="font-medium text-gray-900">{row.player_name}</span>
      </td>

      {/* Package */}
      <td className="px-4 py-3 text-xs text-gray-500">{row.package_name}</td>

      {/* Team */}
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-blue-700">{row.assigned_team_name}</span>
      </td>

      {/* Score */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-700 w-6 text-right">{row.score}</span>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${scoreBarColor}`} style={{ width: `${scorePct}%` }} />
          </div>
        </div>
      </td>

      {/* Signals */}
      <td className="px-4 py-3">
        {expanded ? (
          <div className="flex flex-col gap-1">
            {row.signals.map((s, i) => (
              <span key={i} className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 rounded inline-block">
                {renderSignal(s)}
              </span>
            ))}
            <span className="text-[10px] text-gray-400 italic">click to collapse</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.signals.slice(0, 3).map((s, i) => (
              <span key={i} className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 rounded">
                {renderSignal(s)}
              </span>
            ))}
            {row.signals.length > 3 && (
              <span className="text-[10px] text-blue-500 font-medium">
                +{row.signals.length - 3} more
              </span>
            )}
          </div>
        )}
      </td>

      {/* Assigned by */}
      <td className="px-4 py-3">
        {row.assigned_by === 'coordinator_override' ? (
          <span className="text-[10px] font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">Override</span>
        ) : (
          <span className="text-[10px] text-gray-400">Auto</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          {isSent ? (
            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
              ✓ Sent
            </span>
          ) : (
            <button
              onClick={onAssign}
              disabled={isSending}
              className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSending ? '...' : 'Assign'}
            </button>
          )}
          <button
            onClick={onViewLog}
            className="px-2.5 py-1 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Email Log
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Email Log Modal ──────────────────────────────────────────────────────────

function EmailLogModal({
  playerName, logs, onClose,
}: {
  playerName: string
  logs: NotificationRecord[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Email Log — {playerName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">All emails sent for this player</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto flex-1 p-6">
          {logs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="font-medium mb-1">No emails sent yet for this player</p>
              <p className="text-sm">Click "Assign" on the row to send an assignment email</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.notificationId} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{log.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Not yet sent'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      log.status === 'sent' ? 'bg-green-100 text-green-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <p className="text-amber-700 font-semibold mb-1">⚠️ Would have gone to:</p>
                      <p className="text-gray-800 font-medium">{log.intended_recipient_name}</p>
                      <p className="text-gray-500">{log.intended_recipient_email}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <p className="text-blue-700 font-semibold mb-1">✉ Actually sent to:</p>
                      <p className="text-gray-800 font-medium">{log.actual_recipient_email}</p>
                      <p className="text-gray-500">(test mode)</p>
                    </div>
                  </div>

                  <div className="mt-2.5 text-xs text-gray-500">
                    <span className="font-medium">Team: </span>{log.assigned_team_name}
                    {log.resend_id && <span className="ml-3 text-gray-400">Resend ID: {log.resend_id}</span>}
                  </div>

                  {log.error && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">{log.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
