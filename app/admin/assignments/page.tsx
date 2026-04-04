'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  getAssignments,
  getAssignmentStats,
  type Assignment,
  type AssignmentStatus,
  type ScoreBreakdown,
} from '@/lib/assignments'

// ─── Birth year groups (sidebar filter like the report) ───────────────────────

function getBirthYearGroups(assignments: Assignment[]) {
  const groups = new Map<string, Assignment[]>()
  for (const a of assignments) {
    const key = `${a.playerBirthYear} ${a.playerGender === 'male' ? 'Boys' : 'Girls'}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(a)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

// ─── Score reason tags ────────────────────────────────────────────────────────

function reasonTags(b: ScoreBreakdown) {
  const tags: { label: string; color: string }[] = []
  if (b.coachMatchScore > 0)       tags.push({ label: `Requested coach`, color: 'bg-blue-100 text-blue-700' })
  if (b.friendMatchScore > 0)      tags.push({ label: `Friend match`, color: 'bg-green-100 text-green-700' })
  if (b.siblingScheduleScore > 0)  tags.push({ label: `Sibling schedule`, color: 'bg-orange-100 text-orange-700' })
  if (b.returningPlayerScore > 0)  tags.push({ label: `Returning player`, color: 'bg-gray-100 text-gray-600' })
  if (b.proximityScore >= 25)      tags.push({ label: `Close (${b.distanceMiles?.toFixed(1) ?? '?'} mi)`, color: 'bg-teal-100 text-teal-700' })
  if (!b.hasCapacity)              tags.push({ label: `FULL`, color: 'bg-red-100 text-red-700' })
  return tags
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-500'
}

function scoreBarInline(score: number) {
  const pct = Math.min(score, 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-bold ${scoreColor(score)} w-8`}>{score}</span>
      <span className="text-xs text-gray-400">pts</span>
      <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-1">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function statusBadge(status: AssignmentStatus) {
  const map: Record<AssignmentStatus, { bg: string; label: string }> = {
    pending:    { bg: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    scored:     { bg: 'bg-blue-100 text-blue-800',     label: 'Needs Review' },
    assigned:   { bg: 'bg-green-100 text-green-800',   label: 'Assigned' },
    exception:  { bg: 'bg-red-100 text-red-800',       label: 'Exception' },
    overridden: { bg: 'bg-purple-100 text-purple-800', label: 'Overridden' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>
      {s.label}
    </span>
  )
}

// ─── Single player row — report-style dense view ──────────────────────────────

function PlayerRow({ a }: { a: Assignment }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-4">
        {/* Left: player info */}
        <div className="min-w-0 w-48 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/admin/assignments/${a.profileId}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              {a.playerName}
            </Link>
            {statusBadge(a.status)}
          </div>
          <p className="text-xs text-gray-400">{a.playerBirthYear} &middot; {a.guardianName}</p>
          {a.specialRequest && (
            <p className="text-xs text-blue-600 mt-1.5 font-medium">{a.specialRequest}</p>
          )}
        </div>

        {/* Middle: suggestions with score tags (report-style) */}
        <div className="flex-1 min-w-0">
          {a.scoreBreakdown.length > 0 ? (
            <div className="flex flex-col gap-2">
              {a.scoreBreakdown.map((b, i) => (
                <div
                  key={b.teamId}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
                    i === 0 ? 'border-l-[3px] border-green-500 bg-green-50/50' :
                    i === 1 ? 'border-l-[3px] border-yellow-400 bg-yellow-50/30' :
                    'border-l-[3px] border-gray-300 bg-gray-50/50'
                  }`}
                >
                  <span className="text-xs text-gray-400 font-bold mt-0.5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{b.teamName}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reasonTags(b).map(tag => (
                        <span key={tag.label} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tag.color}`}>
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">{scoreBarInline(b.totalScore)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not yet scored</p>
          )}

          {/* Exception reason inline */}
          {a.exceptionReason && (
            <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{a.exceptionReason}</p>
            </div>
          )}
        </div>

        {/* Right: AI recommendation + actions */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          {a.aiExplanation && (
            <div className="border-l-[3px] border-indigo-400 bg-indigo-50/50 rounded-r-lg px-3 py-2">
              <p className="text-[11px] text-indigo-700 leading-snug">{a.aiExplanation}</p>
            </div>
          )}

          {/* Inline action buttons */}
          <div className="flex items-center gap-2 mt-auto">
            {(a.status === 'scored' || a.status === 'exception') && a.topTeamName && (
              <button
                onClick={() => alert(`[Mock] Approved: ${a.playerName} → ${a.topTeamName}`)}
                className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            )}
            <Link
              href={`/admin/assignments/${a.profileId}`}
              className="px-2.5 py-1 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              {a.status === 'scored' || a.status === 'exception' ? 'Override' : 'Details'}
            </Link>
            {a.parentEmailSent && (
              <span className="text-[10px] text-green-600 font-medium">&#10003; Email sent</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: AssignmentStatus | 'all'; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'scored',     label: 'Review' },
  { key: 'exception',  label: 'Exceptions' },
  { key: 'assigned',   label: 'Assigned' },
  { key: 'overridden', label: 'Overridden' },
]

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<AssignmentStatus | 'all'>('all')
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const stats = getAssignmentStats()
  const allAssignments = getAssignments()
  const birthYearGroups = getBirthYearGroups(allAssignments)

  let filtered = activeTab === 'all'
    ? allAssignments
    : allAssignments.filter(a => a.status === activeTab)

  if (activeGroup) {
    filtered = filtered.filter(a => {
      const key = `${a.playerBirthYear} ${a.playerGender === 'male' ? 'Boys' : 'Girls'}`
      return key === activeGroup
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-500 mt-1">Spring 2026 — Player-to-team assignment queue</p>
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <span className="font-medium text-gray-700">{stats.total} players</span>
        <span className="text-gray-300">|</span>
        <span className="text-green-700 font-medium">{stats.assigned} assigned</span>
        <span className="text-gray-300">|</span>
        <span className="text-blue-700 font-medium">{stats.scored} need review</span>
        <span className="text-gray-300">|</span>
        <span className="text-red-700 font-medium">{stats.exception} exceptions</span>
        <span className="text-gray-300">|</span>
        <span className="text-yellow-700 font-medium">{stats.pending} pending</span>
        <span className="text-gray-300">|</span>
        <span className="text-purple-700 font-medium">{stats.overridden} overridden</span>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar: birth year filter */}
        <div className="w-28 shrink-0 hidden lg:block">
          <div className="sticky top-20">
            <button
              onClick={() => setActiveGroup(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                !activeGroup ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {birthYearGroups.map(([group]) => (
              <button
                key={group}
                onClick={() => setActiveGroup(activeGroup === group ? null : group)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  activeGroup === group
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Status tabs */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-60">
                  {tab.key === 'all' ? stats.total : stats[tab.key as keyof typeof stats]}
                </span>
              </button>
            ))}
          </div>

          {/* Player list — report-style cards */}
          <div className="flex flex-col gap-3">
            {filtered.map(a => (
              <PlayerRow key={a.profileId} a={a} />
            ))}
            {filtered.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
                No assignments in this category.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
