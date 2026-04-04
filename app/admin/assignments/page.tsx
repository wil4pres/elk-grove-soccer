'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  getAssignments,
  getAssignmentStats,
  type Assignment,
  type AssignmentStatus,
} from '@/lib/assignments'

const STATUS_TABS: { key: AssignmentStatus | 'all'; label: string; color: string }[] = [
  { key: 'all',        label: 'All',        color: 'bg-gray-100 text-gray-700' },
  { key: 'pending',    label: 'Pending',    color: 'bg-yellow-100 text-yellow-800' },
  { key: 'scored',     label: 'Review',     color: 'bg-blue-100 text-blue-800' },
  { key: 'exception',  label: 'Exceptions', color: 'bg-red-100 text-red-800' },
  { key: 'assigned',   label: 'Assigned',   color: 'bg-green-100 text-green-800' },
  { key: 'overridden', label: 'Overridden', color: 'bg-purple-100 text-purple-800' },
]

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

function scoreBar(score: number) {
  const pct = Math.min(score, 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 font-medium w-8">{score}</span>
    </div>
  )
}

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<AssignmentStatus | 'all'>('all')
  const stats = getAssignmentStats()
  const allAssignments = getAssignments()
  const filtered = activeTab === 'all'
    ? allAssignments
    : allAssignments.filter(a => a.status === activeTab)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-500 mt-1">Spring 2026 — Player-to-team assignment queue</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Review', value: stats.scored, color: 'text-blue-600' },
          { label: 'Exceptions', value: stats.exception, color: 'text-red-600' },
          { label: 'Assigned', value: stats.assigned, color: 'text-green-600' },
          { label: 'Overridden', value: stats.overridden, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab filters */}
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
              {tab.key === 'all'
                ? stats.total
                : stats[tab.key as keyof typeof stats]}
            </span>
          </button>
        ))}
      </div>

      {/* Assignment list */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Player</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Package</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Top Team</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Score</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(a => (
              <tr key={a.profileId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{a.playerName}</p>
                  <p className="text-xs text-gray-400">{a.guardianName}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{a.packageName}</td>
                <td className="px-4 py-3">{statusBadge(a.status)}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                  {a.assignedTeamName ?? a.topTeamName ?? '—'}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {a.scoreBreakdown.length > 0
                    ? scoreBar(a.scoreBreakdown[0].totalScore)
                    : <span className="text-xs text-gray-400">Not scored</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/assignments/${a.profileId}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {a.status === 'scored' || a.status === 'exception' ? 'Review' : 'View'}
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No assignments in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
