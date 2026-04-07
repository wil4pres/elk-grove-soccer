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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const [report, setReport] = useState<GrandAssignmentReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sendResult, setSendResult] = useState('')
  const [viewTab, setViewTab] = useState<ViewTab>('assignments')
  const [filterPkg, setFilterPkg] = useState<string | null>(null)
  const [filterConfidence, setFilterConfidence] = useState<Confidence | null>(null)

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

  useEffect(() => { loadReport() }, [loadReport])

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

  async function sendEmails() {
    if (!confirm('Send assignment emails? All go to wnewsom@elkgrovesoccer.com (test mode).')) return
    setSending(true)
    setSendResult('')
    setError('')
    try {
      const res = await fetch('/api/admin/send-assignment-emails', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSendResult(data.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
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
      // Re-run to reassign displaced players with new capacity
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
                onClick={sendEmails}
                disabled={sending || running}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending...' : '✉ Send Emails'}
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
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(a => (
                    <AssignmentTableRow key={a.player_id} row={a} />
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
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
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StatBadge({ label, variant }: { label: string; variant?: 'green' | 'red' }) {
  const cls =
    variant === 'green' ? 'bg-green-50 border-green-300 text-green-800 font-semibold' :
    variant === 'red' ? 'bg-red-50 border-red-300 text-red-800 font-semibold' :
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

function AssignmentTableRow({ row }: { row: AssignmentRow }) {
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
  const visibleSignals = expanded ? row.signals : row.signals.slice(0, 3)
  const hasMore = row.signals.length > 3

  return (
    <tr
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
                {s}
              </span>
            ))}
            <span className="text-[10px] text-gray-400 italic">click to collapse</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.signals.slice(0, 3).map((s, i) => (
              <span key={i} className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 rounded">
                {s.length > 50 ? s.slice(0, 47) + '...' : s}
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
    </tr>
  )
}
