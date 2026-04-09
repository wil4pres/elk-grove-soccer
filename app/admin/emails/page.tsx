'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminFetch } from '@/app/admin/_utils/admin-fetch'

interface NotificationRecord {
  notificationId: string
  season: string
  player_id: string
  player_name: string
  intended_recipient_email: string
  intended_recipient_name: string
  actual_recipient_email: string
  subject: string
  template: string
  assigned_team_name: string
  status: 'queued' | 'sent' | 'failed'
  resend_id?: string
  error?: string
  sent_at?: string
  created_at: string
}

export default function EmailLogPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sendResult, setSendResult] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/send-assignment-emails')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function sendAll() {
    if (!confirm('Send assignment confirmation emails (test mode — all go to wnewsom@elkgrovesoccer.com)?')) return
    setSending(true)
    setSendResult('')
    setError('')
    try {
      const res = await adminFetch('/api/admin/send-assignment-emails', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSendResult(data.message)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Log</h1>
          <p className="text-gray-500 mt-1">
            All outbound notifications — Spring 2026
            <span className="ml-2 text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
              ⚠️ TEST MODE — all emails go to wnewsom@elkgrovesoccer.com
            </span>
          </p>
        </div>
        <button
          onClick={sendAll}
          disabled={sending}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {sending ? 'Sending...' : 'Send Assignment Emails'}
        </button>
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

      {/* Stats */}
      {!loading && notifications.length > 0 && (
        <div className="flex gap-2 mb-4">
          <span className="border border-gray-200 bg-white rounded-md px-3 py-1.5 text-xs text-gray-500">{stats.total} total</span>
          <span className="border border-green-300 bg-green-50 rounded-md px-3 py-1.5 text-xs text-green-800 font-semibold">{stats.sent} sent</span>
          {stats.failed > 0 && <span className="border border-red-300 bg-red-50 rounded-md px-3 py-1.5 text-xs text-red-800 font-semibold">{stats.failed} failed</span>}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Player</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Team</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Would go to</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actually sent to</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notifications.map(n => (
                <tr key={n.notificationId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{n.player_name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{n.assigned_team_name}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 text-xs font-medium">{n.intended_recipient_name}</p>
                    <p className="text-gray-400 text-xs">{n.intended_recipient_email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-amber-700 font-medium">{n.actual_recipient_email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      n.status === 'sent'   ? 'bg-green-100 text-green-800' :
                      n.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {n.status}
                    </span>
                    {n.error && <p className="text-red-500 text-[10px] mt-0.5 max-w-xs">{n.error}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                    {n.sent_at ? new Date(n.sent_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <p className="font-medium mb-1">No emails sent yet</p>
                    <p className="text-sm">Run a Grand Assignment first, then click "Send Assignment Emails"</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
