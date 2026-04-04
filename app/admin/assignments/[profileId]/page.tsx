'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAssignment, getAuditLog, type ScoreBreakdown } from '@/lib/assignments'

function statusBadge(status: string) {
  const map: Record<string, { bg: string; label: string }> = {
    pending:    { bg: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    scored:     { bg: 'bg-blue-100 text-blue-800',     label: 'Needs Review' },
    assigned:   { bg: 'bg-green-100 text-green-800',   label: 'Assigned' },
    exception:  { bg: 'bg-red-100 text-red-800',       label: 'Exception' },
    overridden: { bg: 'bg-purple-100 text-purple-800', label: 'Overridden' },
  }
  const s = map[status] ?? { bg: 'bg-gray-100 text-gray-700', label: status }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg}`}>
      {s.label}
    </span>
  )
}

function ScoreRow({ b, isTop }: { b: ScoreBreakdown; isTop: boolean }) {
  return (
    <div className={`border rounded-xl p-4 ${isTop ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{b.teamName}</p>
          {isTop && <span className="text-xs text-green-700 font-medium">Top suggestion</span>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{b.totalScore}</p>
          <p className="text-xs text-gray-400">/100</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {[
          { label: 'Proximity', score: b.proximityScore, max: 30, detail: b.distanceMiles ? `${b.distanceMiles.toFixed(1)} mi` : '—' },
          { label: 'Coach match', score: b.coachMatchScore, max: 25 },
          { label: 'Friend match', score: b.friendMatchScore, max: 20 },
          { label: 'Sibling schedule', score: b.siblingScheduleScore, max: 15 },
          { label: 'Returning player', score: b.returningPlayerScore, max: 5 },
          { label: 'Capacity', score: b.capacityScore, max: 5, detail: b.hasCapacity ? 'Open' : 'Full' },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-500">{item.label}</p>
            <p className="font-semibold text-gray-800">
              {item.score}/{item.max}
              {item.detail && <span className="text-gray-400 font-normal ml-1">({item.detail})</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.profileId as string
  const assignment = getAssignment(profileId)
  const audit = getAuditLog(profileId)

  const [showOverride, setShowOverride] = useState(false)
  const [overrideTeam, setOverrideTeam] = useState('')
  const [justification, setJustification] = useState('')

  if (!assignment) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Assignment not found.</p>
        <Link href="/admin/assignments" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to assignments
        </Link>
      </div>
    )
  }

  const canApprove = assignment.status === 'scored' || assignment.status === 'exception'

  return (
    <div className="max-w-3xl">
      <Link href="/admin/assignments" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">
        &larr; Back to assignments
      </Link>

      {/* Player header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{assignment.playerName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{assignment.packageName}</p>
          </div>
          {statusBadge(assignment.status)}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs font-medium">Guardian</p>
            <p className="text-gray-700">{assignment.guardianName}</p>
            <p className="text-gray-400 text-xs">{assignment.guardianEmail}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium">Birth year</p>
            <p className="text-gray-700">{assignment.playerBirthYear} ({assignment.playerGender})</p>
          </div>
        </div>
      </div>

      {/* Special request */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-2">Special request</h2>
        <p className="text-gray-600 text-sm italic">&quot;{assignment.specialRequest}&quot;</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {assignment.requestedCoaches.map(c => (
            <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              Coach: {c}
            </span>
          ))}
          {assignment.requestedFriends.map(f => (
            <span key={f} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              Friend: {f}
            </span>
          ))}
          {assignment.siblingNames.map(s => (
            <span key={s} className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
              Sibling: {s}
            </span>
          ))}
        </div>
      </div>

      {/* Exception reason */}
      {assignment.exceptionReason && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-red-800 text-sm mb-1">Exception</h2>
          <p className="text-red-700 text-sm">{assignment.exceptionReason}</p>
        </div>
      )}

      {/* AI explanation */}
      {assignment.aiExplanation && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-indigo-800 text-sm mb-1">AI explanation</h2>
          <p className="text-indigo-700 text-sm">{assignment.aiExplanation}</p>
        </div>
      )}

      {/* Assigned team */}
      {assignment.assignedTeamName && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-green-800 text-sm">Assigned to</h2>
              <p className="text-green-900 font-bold">{assignment.assignedTeamName}</p>
            </div>
            <div className="text-right text-xs text-green-600">
              <p>By {assignment.assignedBy}</p>
              {assignment.parentEmailSent && <p>Email sent {new Date(assignment.parentEmailSentAt!).toLocaleDateString()}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Score breakdown */}
      {assignment.scoreBreakdown.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Score breakdown</h2>
          <div className="flex flex-col gap-3">
            {assignment.scoreBreakdown.map((b, i) => (
              <ScoreRow key={b.teamId} b={b} isTop={i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canApprove && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {assignment.topTeamName && (
              <button
                onClick={() => {
                  alert(`[Mock] Approved: ${assignment.playerName} → ${assignment.topTeamName}`)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Approve: {assignment.topTeamName}
              </button>
            )}
            <button
              onClick={() => setShowOverride(!showOverride)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Override to different team
            </button>
          </div>

          {showOverride && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to team
              </label>
              <select
                value={overrideTeam}
                onChange={e => setOverrideTeam(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
              >
                <option value="">Select team...</option>
                {assignment.scoreBreakdown.map(b => (
                  <option key={b.teamId} value={b.teamId}>
                    {b.teamName} ({b.totalScore}/100) {!b.hasCapacity ? '[FULL]' : ''}
                  </option>
                ))}
              </select>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder="Why are you overriding the system suggestion?"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
              />
              <button
                disabled={!overrideTeam || !justification.trim()}
                onClick={() => {
                  alert(`[Mock] Override: ${assignment.playerName} → ${overrideTeam}\nJustification: ${justification}`)
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply override
              </button>
            </div>
          )}
        </div>
      )}

      {/* Audit trail */}
      {audit.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Audit trail</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {audit.map(e => (
                <div key={e.auditId} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    e.eventType.includes('exception') ? 'bg-red-500' :
                    e.eventType.includes('override') ? 'bg-purple-500' :
                    e.eventType.includes('email') ? 'bg-blue-500' :
                    e.eventType.includes('success') || e.eventType.includes('assigned') ? 'bg-green-500' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{e.eventType.replace(/_/g, ' ')}</span>
                      {e.teamName && <span className="text-gray-500"> — {e.teamName}</span>}
                    </p>
                    {e.notes && <p className="text-xs text-gray-400 mt-0.5">{e.notes}</p>}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    {new Date(e.occurredAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
