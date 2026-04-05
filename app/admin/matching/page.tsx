'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type Status = 'idle' | 'loading' | 'done' | 'error'
type MatchingProcessStatus = 'idle' | 'running' | 'completed' | 'failed'

interface Suggestion { team: string; score: number; reasons: string[] }
interface Recommendation { text: string; level: 'green' | 'yellow' | 'orange' | 'red' }
interface ScoredPlayer {
  player: {
    player_id: string; first_name: string; last_name: string
    birth_date: string; prev_team: string; school_and_grade: string
    special_request: string; new_or_returning: string
  }
  suggestions: Suggestion[]
  recommendation: Recommendation
}
interface PackageResult {
  package_name: string
  players: ScoredPlayer[]
  stats: { total: number; returning: number; withRequests: number; matched: number; needReview: number }
}

export default function MatchingPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [packages, setPackages] = useState<PackageResult[]>([])
  const [activeTab, setActiveTab] = useState('')
  const [error, setError] = useState('')
  const [matchingStatus, setMatchingStatus] = useState<MatchingProcessStatus>('idle')
  const [matchingError, setMatchingError] = useState('')
  const [completedTime, setCompletedTime] = useState('')
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const loadData = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/admin/matching-data')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setPackages(data.packages)
      if (data.packages.length > 0 && !activeTab) {
        setActiveTab(data.packages[0].package_name)
      }
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [activeTab])

  const checkMatchingStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/trigger-matching')
      if (!res.ok) return
      const state = await res.json()
      setMatchingStatus(prev => {
        if (prev === 'running' && state.status === 'idle') return prev
        return state.status
      })
      if (state.status === 'running' && state.startedAt) {
        setStartedAt(new Date(state.startedAt))
        if (state.stepLabel) setStepLabel(state.stepLabel)
      }
      if (state.status === 'completed' || state.status === 'failed') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setStartedAt(null)
        setElapsedSeconds(0)
        setStepLabel('')
        if (state.status === 'failed') {
          setMatchingError(state.error || 'Matching failed')
        } else {
          const completedAt = state.completedAt
            ? new Date(state.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          setCompletedTime(completedAt)
          setTimeout(() => { setMatchingStatus('idle'); setCompletedTime('') }, 8000)
        }
      }
    } catch (e) {
      console.error('Error checking matching status:', e)
    }
  }, [])

  // Elapsed timer while running
  useEffect(() => {
    if (matchingStatus !== 'running') return
    const t = setInterval(() => {
      setElapsedSeconds(startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0)
    }, 1000)
    return () => clearInterval(t)
  }, [matchingStatus, startedAt])

  async function resetStuckJob() {
    await fetch('/api/admin/trigger-matching', { method: 'DELETE' })
    setMatchingStatus('idle')
    setMatchingError('')
    setStartedAt(null)
    setElapsedSeconds(0)
  }

  // Poll matching status when running
  useEffect(() => {
    if (matchingStatus === 'running') {
      checkMatchingStatus()
      pollIntervalRef.current = setInterval(checkMatchingStatus, 2000)
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [matchingStatus, checkMatchingStatus])

  // Refresh recommendations every 5 seconds
  useEffect(() => {
    refreshIntervalRef.current = setInterval(loadData, 5000)
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current) }
  }, [loadData])

  // Initial load
  useEffect(() => {
    loadData()
    checkMatchingStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerMatching() {
    setMatchingError('')
    try {
      const res = await fetch('/api/admin/trigger-matching', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setMatchingError(res.status === 409 ? 'Matching already in progress' : data.error || 'Failed to start matching')
        return
      }
      setMatchingStatus('running')
      setStartedAt(new Date())
      setElapsedSeconds(0)
      setStepLabel('Starting…')
    } catch (e) {
      setMatchingError(e instanceof Error ? e.message : 'Failed to start matching')
    }
  }

  const activePkg = packages.find(p => p.package_name === activeTab)

  return (
    <>
    {/* Floating trigger button — always visible */}
    <div style={{ position: 'fixed', top: 60, right: 16, zIndex: 9999, textAlign: 'right' }}>
      <button
        onClick={triggerMatching}
        disabled={matchingStatus === 'running'}
        style={{
          background: matchingStatus === 'running' ? '#6b7280' : matchingStatus === 'completed' ? '#15803d' : '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '10px 18px',
          fontSize: 14,
          fontWeight: 700,
          cursor: matchingStatus === 'running' ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {matchingStatus === 'running'
          ? `⏳ ${stepLabel || 'Running…'} ${elapsedSeconds}s`
          : matchingStatus === 'completed'
          ? `✓ Done — ${completedTime}`
          : '▶ Generate Recommendations'}
      </button>
      {matchingStatus === 'running' && elapsedSeconds > 120 && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#f59e0b' }}>
          Taking a while…{' '}
          <button onClick={resetStuckJob} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}>
            Reset stuck job
          </button>
        </div>
      )}
      {matchingError && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 6, padding: '6px 10px', marginTop: 6, fontSize: 12 }}>
          {matchingError}{' '}
          <button onClick={resetStuckJob} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0 }}>
            Reset &amp; retry
          </button>
        </div>
      )}
    </div>
    <div className="fixed inset-0 top-14 flex w-full" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <div className="w-[90px] bg-[#1e3a5f] flex flex-col overflow-y-auto shrink-0">
        <h1 className="text-white text-[10px] text-center py-3 px-1.5 border-b border-[#2d5a8e] leading-tight font-bold">
          EGS<br />Matching<br />2026
        </h1>
        {packages.map(pkg => {
          const parts = pkg.package_name.split(' ')
          const year = parts[0]
          const gender = parts.slice(1).join(' ')
          return (
            <button
              key={pkg.package_name}
              onClick={() => setActiveTab(pkg.package_name)}
              className={`border-none cursor-pointer py-2.5 px-1 text-[13px] font-semibold text-center leading-tight transition-all border-l-[3px] ${
                activeTab === pkg.package_name
                  ? 'bg-[#2d5a8e] text-white border-l-[#38bdf8]'
                  : 'bg-transparent text-[#94b8d8] border-l-transparent hover:bg-[#2d5a8e] hover:text-white'
              }`}
            >
              {year}<br />
              <span className="text-[10px] font-normal opacity-80">{gender}</span>
            </button>
          )
        })}
        {packages.length === 0 && status !== 'loading' && (
          <p className="text-[#94b8d8] text-[10px] text-center px-2 py-4">No data</p>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#1e3a5f] text-white px-5 py-3.5 flex items-center gap-3 shrink-0">
          <h2 className="text-base font-bold">{activeTab || 'Matching'}</h2>
          <span className="text-xs opacity-70">Elk Grove Soccer — Team Assignment Suggestions</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={triggerMatching}
              disabled={matchingStatus === 'running'}
              className={`px-4 py-1.5 text-sm font-semibold text-white rounded-md transition-colors ${
                matchingStatus === 'running' ? 'bg-white/20 cursor-not-allowed' :
                matchingStatus === 'completed' ? 'bg-green-500 cursor-default' :
                'bg-green-600 hover:bg-green-700'
              }`}
            >
              {matchingStatus === 'running'
                ? <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle" />{stepLabel || 'Running…'}</>
                : matchingStatus === 'completed'
                ? `✓ Done — ${completedTime}`
                : 'Generate Recommendations'
              }
            </button>
            {matchingError && <span className="text-xs text-red-300">{matchingError}</span>}
            <button
              onClick={loadData}
              disabled={status === 'loading'}
              className="px-3 py-1.5 text-sm font-medium text-white/80 border border-white/20 rounded-md hover:bg-white/10 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f1f5f9]">
          {status === 'loading' && packages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading matching data...</p>
              </div>
            </div>
          )}

          {error && status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
              <p className="text-red-800 font-semibold mb-2">Error loading data</p>
              <p className="text-red-600 text-sm">{error}</p>
              <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Retry
              </button>
            </div>
          )}

          {activePkg && (
            <>
              {/* Stats bar */}
              <div className="flex gap-2.5 flex-wrap mb-3.5">
                <Stat label={`${activePkg.stats.total} players`} />
                <Stat label={`${activePkg.stats.returning} returning`} />
                <Stat label={`${activePkg.stats.withRequests} with requests`} />
                <Stat label={`${activePkg.stats.matched} matched`} variant="green" />
                <Stat label={`${activePkg.stats.needReview} need review`} variant="yellow" />
              </div>

              {/* Player table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden text-[13px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[#475569] text-[11px] uppercase tracking-wider">
                      <th className="px-3 py-2.5 text-left font-semibold w-[140px]">Player</th>
                      <th className="px-3 py-2.5 text-left font-semibold w-[160px]">2025 Team</th>
                      <th className="px-3 py-2.5 text-left font-semibold w-[150px]">School / Grade</th>
                      <th className="px-3 py-2.5 text-left font-semibold w-[180px]">Special Request</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Suggestions</th>
                      <th className="px-3 py-2.5 text-left font-semibold w-[220px]">AI Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePkg.players.map(sp => (
                      <PlayerRow key={sp.player.player_id} data={sp} />
                    ))}
                    {activePkg.players.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-gray-400 italic py-8">No players in this group</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {packages.length === 0 && status === 'done' && (
            <div className="flex items-center justify-center h-full">
              <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md">
                <h2 className="text-lg font-bold text-[#1e3a5f] mb-3">No 2026 Data</h2>
                <p className="text-sm text-gray-500">Upload players on the Uploads page, then click Generate Recommendations.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function Stat({ label, variant }: { label: string; variant?: 'green' | 'yellow' }) {
  const cls =
    variant === 'green' ? 'bg-green-50 border-green-300 text-green-800 font-semibold' :
    variant === 'yellow' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
    'bg-white border-gray-200 text-gray-500'
  return <span className={`border rounded-md px-3 py-1.5 text-xs ${cls}`}>{label}</span>
}

function PlayerRow({ data }: { data: ScoredPlayer }) {
  const { player, suggestions, recommendation } = data
  const isNew = (player.new_or_returning || '').toLowerCase().includes('new')
  const hasRequest = player.special_request &&
    !['n/a', 'na', 'none', '-', ''].includes(player.special_request.toLowerCase().trim())

  const recColor = {
    green: 'bg-green-50 border-l-green-500 text-green-900',
    yellow: 'bg-amber-50 border-l-amber-400 text-amber-900',
    orange: 'bg-orange-50 border-l-orange-400 text-orange-900',
    red: 'bg-red-50 border-l-red-400 text-red-900',
  }[recommendation.level]

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${isNew ? 'bg-yellow-50/50' : ''}`}>
      <td className="px-3 py-2.5 align-top">
        <div className="font-semibold text-gray-900">{player.first_name} {player.last_name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {player.birth_date}
          {isNew && <span className="ml-1.5 bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">NEW</span>}
        </div>
      </td>
      <td className="px-3 py-2.5 align-top">
        {player.prev_team
          ? <span className="text-xs text-blue-700">{player.prev_team}</span>
          : <span className="text-xs text-gray-300 italic">No history</span>
        }
      </td>
      <td className="px-3 py-2.5 align-top text-xs text-gray-600">{player.school_and_grade || '—'}</td>
      <td className="px-3 py-2.5 align-top">
        {hasRequest
          ? <span className="text-xs text-emerald-700">{player.special_request}</span>
          : <span className="text-gray-200">—</span>
        }
      </td>
      <td className="px-3 py-2.5 align-top">
        {suggestions.length > 0 ? suggestions.map((s, i) => (
          <SuggestionCard key={i} suggestion={s} rank={i + 1} />
        )) : (
          <span className="text-red-400 text-xs italic">Not Enough Data to Match with</span>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className={`text-xs leading-relaxed p-2 rounded-md border-l-[3px] ${recColor}`}>
          {recommendation.text}
        </div>
      </td>
    </tr>
  )
}

function SuggestionCard({ suggestion, rank }: { suggestion: Suggestion; rank: number }) {
  const borderColor = rank === 1 ? 'border-l-green-500 bg-green-50' :
                      rank === 2 ? 'border-l-amber-400 bg-amber-50' :
                      'border-l-gray-300 bg-gray-50'
  const pct = Math.min(100, (suggestion.score / 10) * 100)
  const barColor = suggestion.score >= 5 ? '#22c55e' : suggestion.score >= 3 ? '#f59e0b' : '#94a3b8'

  return (
    <div className={`mb-2 rounded-md p-2 border-l-[3px] ${borderColor}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] font-bold text-gray-400 w-4">#{rank}</span>
        <span className="text-xs font-semibold text-gray-900 flex-1">{suggestion.team}</span>
        <span className="text-[11px] font-bold text-gray-500 w-9 text-right">{suggestion.score} pts</span>
        <div className="w-14 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {suggestion.reasons.map((r, i) => (
          <span key={i} className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 rounded">{r}</span>
        ))}
      </div>
    </div>
  )
}
