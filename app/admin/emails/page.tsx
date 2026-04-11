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

// ─── Sample thread data ────────────────────────────────────────────────────────

interface EmailMessage {
  from: string
  fromEmail: string
  to: string
  toEmail: string
  date: string
  body: string
  hasButtons?: boolean
}
interface Thread {
  id: string
  subject: string
  tag?: 'accept-decline' | 'question' | 'standard'
  messages: EmailMessage[]
}

const SAMPLE_THREADS: Thread[] = [
  {
    id: '1',
    subject: '✅ Action required: Confirm placement for Emma Rodriguez — 2014G Fire (Patel)',
    tag: 'accept-decline',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Maria Rodriguez',
        toEmail: 'mrodriguez@gmail.com',
        date: 'Apr 9, 2026 · 7:34 PM',
        body: `Hi Maria,\n\nGreat news — Emma has been placed on a team for the Spring 2026 season!\n\n📋 Team: 2014G Fire (Patel)\n\nHer coach and practice schedule will follow within the next 48 hours. Please confirm or decline her spot below.`,
        hasButtons: true,
      },
      {
        from: 'Maria Rodriguez',
        fromEmail: 'mrodriguez@gmail.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 9, 2026 · 8:12 PM',
        body: `Hi! Emma is so excited. We accept! One question — do you know what field they'll practice at? We're hoping for Bartholomew since that's close to us. Thanks!`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Maria Rodriguez',
        toEmail: 'mrodriguez@gmail.com',
        date: 'Apr 10, 2026 · 9:05 AM',
        body: `Hi Maria,\n\nSo glad Emma is excited! Coach Patel typically uses Bartholomew East for weekday practices. You'll get the full schedule from her directly this week.\n\nSee you on the field! ⚽`,
      },
    ],
  },
  {
    id: '2',
    subject: '✅ Action required: Confirm placement for Noah Kim — 2016B Lightning (Okafor)',
    tag: 'accept-decline',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'James Kim',
        toEmail: 'james.kim@outlook.com',
        date: 'Apr 9, 2026 · 7:34 PM',
        body: `Hi James,\n\nNoah has been placed on a team for Spring 2026!\n\n📋 Team: 2016B Lightning (Okafor)\n\nPlease confirm or decline his spot. If you have a conflict or concern, reply to this email and we'll work with you.`,
        hasButtons: true,
      },
      {
        from: 'James Kim',
        fromEmail: 'james.kim@outlook.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 9, 2026 · 11:47 PM',
        body: `Hi,\n\nWe actually need to decline this one. We put in a request to be on the same team as Tyler Nguyen — they've been together for 3 years. Is there any way to revisit?`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'James Kim',
        toEmail: 'james.kim@outlook.com',
        date: 'Apr 10, 2026 · 8:30 AM',
        body: `Hi James,\n\nThank you for letting us know! I see the note about Tyler — I'll check the 2016B roster and see if we can get them on the same team. I'll follow up by end of day.\n\nWe absolutely try to honor sibling and friend requests when possible.`,
      },
    ],
  },
  {
    id: '3',
    subject: 'Spring 2026 Team Assignment — Sophia Tran · 2015G Storm (Mehta)',
    tag: 'standard',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Linda Tran',
        toEmail: 'ltran@yahoo.com',
        date: 'Apr 9, 2026 · 7:35 PM',
        body: `Hi Linda,\n\nSophia has been placed on the 2015G Storm (Mehta) for Spring 2026. Her coach will reach out within the next few days with the practice schedule and first game info.\n\nIf you have any questions, just reply to this email. Go team! ⚽`,
      },
      {
        from: 'Linda Tran',
        fromEmail: 'ltran@yahoo.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 10, 2026 · 6:50 AM',
        body: `Thank you! Sophia played on Storm last year too — she'll be so happy to hear this. Will the coach be reaching out by text or email?`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Linda Tran',
        toEmail: 'ltran@yahoo.com',
        date: 'Apr 10, 2026 · 9:15 AM',
        body: `Hi Linda,\n\nCoach Mehta usually reaches out by email first, then sets up a team chat. She's great about keeping everyone in the loop. So glad Sophia is returning to Storm!`,
      },
    ],
  },
  {
    id: '4',
    subject: '✅ Action required: Confirm placement for Aiden Park — 2013B Wolves (Chen)',
    tag: 'accept-decline',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Susan Park',
        toEmail: 'spark94@gmail.com',
        date: 'Apr 9, 2026 · 7:34 PM',
        body: `Hi Susan,\n\nAiden has been placed on a team for Spring 2026!\n\n📋 Team: 2013B Wolves (Chen)\n\nPlease confirm or decline his spot using the buttons below. His coach will follow up with practice details once confirmed.`,
        hasButtons: true,
      },
      {
        from: 'Susan Park',
        fromEmail: 'spark94@gmail.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 9, 2026 · 10:02 PM',
        body: `Accepted! Aiden is pumped. Quick note — he has a spring break trip April 14–18. Will that be a problem?`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Susan Park',
        toEmail: 'spark94@gmail.com',
        date: 'Apr 10, 2026 · 8:55 AM',
        body: `Hi Susan,\n\nNo problem at all — life happens! Just let Coach Chen know directly when she reaches out and she'll note it. Enjoy the trip! 🌴`,
      },
    ],
  },
  {
    id: '5',
    subject: 'Spring 2026 Team Assignment — Lily Johnson · 2017G Dynamos (Patel)',
    tag: 'standard',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Robert Johnson',
        toEmail: 'rjohnson@comcast.net',
        date: 'Apr 9, 2026 · 7:35 PM',
        body: `Hi Robert,\n\nLily has been placed on the 2017G Dynamos (Patel) for Spring 2026. This is a great group and we think she'll love it.\n\nQuestions? Just reply here. ⚽`,
      },
      {
        from: 'Robert Johnson',
        fromEmail: 'rjohnson@comcast.net',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 11, 2026 · 2:30 PM',
        body: `Hi there — we hadn't heard from a coach yet. Is there a delay? Lily is asking every day if she has a team yet 😄`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Robert Johnson',
        toEmail: 'rjohnson@comcast.net',
        date: 'Apr 11, 2026 · 3:45 PM',
        body: `Ha, tell Lily to hang tight! Coach Patel is sending out an intro email this evening. We had a small delay getting rosters finalized. She'll have everything by tonight!`,
      },
    ],
  },
  {
    id: '6',
    subject: '✅ Action required: Confirm placement for Marcus Webb — 2014B Vikings (Mehl)',
    tag: 'accept-decline',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Dana Webb',
        toEmail: 'danawebb@icloud.com',
        date: 'Apr 9, 2026 · 7:34 PM',
        body: `Hi Dana,\n\nMarcus has been placed on a team for Spring 2026!\n\n📋 Team: 2014B Vikings (Mehl)\n\nPlease confirm or decline. Coach Mehl runs a competitive but fun program — Marcus should have a great season.`,
        hasButtons: true,
      },
      {
        from: 'Dana Webb',
        fromEmail: 'danawebb@icloud.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 10, 2026 · 7:18 AM',
        body: `We accept! Marcus has been waiting all week to find out. He was on Vikings in 2024 so he'll know a few of the kids already. Perfect placement, thank you!`,
      },
    ],
  },
  {
    id: '7',
    subject: 'Spring 2026 Team Assignment — Chloe Nguyen · 2016G Phoenix (Davis)',
    tag: 'standard',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Kevin Nguyen',
        toEmail: 'k.nguyen82@gmail.com',
        date: 'Apr 9, 2026 · 7:35 PM',
        body: `Hi Kevin,\n\nChloe has been placed on the 2016G Phoenix (Davis) for Spring 2026. Coach Davis will be in touch with practice times and field info within the next few days.\n\nLet us know if you have any questions. ⚽`,
      },
      {
        from: 'Kevin Nguyen',
        fromEmail: 'k.nguyen82@gmail.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 9, 2026 · 9:55 PM',
        body: `Thanks! We requested carpool with the Ramirez family — is there any chance they ended up on the same team? We live two streets apart and it would really help.`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Kevin Nguyen',
        toEmail: 'k.nguyen82@gmail.com',
        date: 'Apr 10, 2026 · 9:30 AM',
        body: `Hi Kevin,\n\nI checked — Isabella Ramirez is also on Phoenix (Davis)! The carpool request came through and we were able to honor it. You should be all set. Might be worth connecting with the Ramirez family directly once Coach Davis sends the intro email.`,
      },
    ],
  },
  {
    id: '8',
    subject: 'Spring 2026 Team Assignment — Ethan Morris · 2015B Thunder (Williams)',
    tag: 'standard',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Pam Morris',
        toEmail: 'pammorris@hotmail.com',
        date: 'Apr 9, 2026 · 7:35 PM',
        body: `Hi Pam,\n\nEthan has been placed on the 2015B Thunder (Williams) for Spring 2026. This team has been together for a couple of seasons — great culture.\n\nCoach Williams will be in touch soon. ⚽`,
      },
      {
        from: 'Pam Morris',
        fromEmail: 'pammorris@hotmail.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 10, 2026 · 11:20 AM',
        body: `Hi — we didn't submit a registration for 2026, only 2025. Is it possible Ethan got included by mistake? We need to sit this season out due to schedule conflicts.`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Pam Morris',
        toEmail: 'pammorris@hotmail.com',
        date: 'Apr 10, 2026 · 12:45 PM',
        body: `Hi Pam,\n\nThank you for catching that! I'll remove Ethan from the Thunder roster and note this in our system. No action needed from you. We hope to see him back in fall — take care!`,
      },
    ],
  },
  {
    id: '9',
    subject: '✅ Action required: Confirm placement for Zoe Carter — 2013G Eclipse (Ramirez)',
    tag: 'accept-decline',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Tom Carter',
        toEmail: 'tom.carter@gmail.com',
        date: 'Apr 9, 2026 · 7:34 PM',
        body: `Hi Tom,\n\nZoe has been placed on a team for Spring 2026!\n\n📋 Team: 2013G Eclipse (Ramirez)\n\nThis is a competitive U13 group. Please confirm or decline her spot below.`,
        hasButtons: true,
      },
      {
        from: 'Tom Carter',
        fromEmail: 'tom.carter@gmail.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 10, 2026 · 6:00 AM',
        body: `Confirmed! Zoe's been working hard to get to this level. One thing — she has a club tournament May 3rd weekend. Coach Ramirez should know ahead of time.`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Tom Carter',
        toEmail: 'tom.carter@gmail.com',
        date: 'Apr 10, 2026 · 9:00 AM',
        body: `Confirmed, and congrats to Zoe! Definitely loop in Coach Ramirez on the May 3rd conflict — she's great about scheduling around club commitments. We're excited to have Zoe on Eclipse.`,
      },
    ],
  },
  {
    id: '10',
    subject: 'Spring 2026 Team Assignment — Liam Okonkwo · 2018B Rockets (Harris)',
    tag: 'standard',
    messages: [
      {
        from: 'EGS Assignments',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Grace Okonkwo',
        toEmail: 'grace.okonkwo@gmail.com',
        date: 'Apr 9, 2026 · 7:35 PM',
        body: `Hi Grace,\n\nLiam has been placed on the 2018B Rockets (Harris) for Spring 2026 — this is his first season and we couldn't be more excited to have him!\n\nCoach Harris runs a fantastic intro program for first-year players. See you on the field! ⚽`,
      },
      {
        from: 'Grace Okonkwo',
        fromEmail: 'grace.okonkwo@gmail.com',
        to: 'EGS Assignments',
        toEmail: 'assignments@sacramento.soccer',
        date: 'Apr 9, 2026 · 9:40 PM',
        body: `Oh this is wonderful! Liam has been counting down the days. Is there anything we should bring to the first practice? Cleats, shin guards — anything specific?`,
      },
      {
        from: 'Coordinator',
        fromEmail: 'assignments@sacramento.soccer',
        to: 'Grace Okonkwo',
        toEmail: 'grace.okonkwo@gmail.com',
        date: 'Apr 10, 2026 · 8:45 AM',
        body: `Hi Grace!\n\nCleats and shin guards are a must. A size 3 or 4 ball is great to have for practice at home, but not required for team practice — Coach Harris provides those. And of course plenty of water! Jerseys will be distributed by the coach at the first session.\n\nWelcome to EGS, Liam! 🎉`,
      },
    ],
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EmailLogPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sendResult, setSendResult] = useState('')
  const [activeTab, setActiveTab] = useState<'log' | 'threads'>('threads')
  const [openThread, setOpenThread] = useState<string | null>('1')

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

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('threads')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
            activeTab === 'threads'
              ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sample Threads
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">10</span>
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
            activeTab === 'log'
              ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sent Log
          {stats.total > 0 && (
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{stats.total}</span>
          )}
        </button>
      </div>

      {/* Sample Threads */}
      {activeTab === 'threads' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 mb-3">
            Sample email threads showing the parent notification flow — standard assignments, action-required confirmations (✅), and reply chains.
          </p>
          {SAMPLE_THREADS.map(thread => {
            const isOpen = openThread === thread.id
            const isActionRequired = thread.tag === 'accept-decline'
            return (
              <div key={thread.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Thread header */}
                <button
                  onClick={() => setOpenThread(isOpen ? null : thread.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold truncate ${isActionRequired ? 'text-emerald-800' : 'text-gray-900'}`}>
                        {thread.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{thread.messages[0].to}</span>
                      <span>·</span>
                      <span>{thread.messages.length} messages</span>
                      <span>·</span>
                      <span>{thread.messages[0].date}</span>
                    </div>
                  </div>
                  {isActionRequired && (
                    <span className="shrink-0 text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                      Action Required
                    </span>
                  )}
                  <span className="shrink-0 text-gray-400 text-lg leading-none">{isOpen ? '▾' : '▸'}</span>
                </button>

                {/* Messages */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {thread.messages.map((msg, i) => {
                      const isEGS = msg.from === 'EGS Assignments' || msg.from === 'Coordinator'
                      return (
                        <div key={i} className={`px-5 py-4 ${isEGS ? 'bg-blue-50/40' : ''}`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isEGS ? 'bg-[#1e3a5f] text-white' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {msg.from[0]}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-gray-900">{msg.from}</span>
                                <span className="ml-2 text-xs text-gray-400">&lt;{msg.fromEmail}&gt;</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{msg.date}</span>
                          </div>
                          <div className="text-xs text-gray-400 mb-3">
                            To: {msg.to} &lt;{msg.toEmail}&gt;
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{msg.body}</p>

                          {/* Accept / Decline buttons */}
                          {msg.hasButtons && (
                            <div className="mt-4 flex gap-3">
                              <button className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                                ✓ Accept Placement
                              </button>
                              <button className="px-5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                                ✕ Decline / Request Change
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sent Log tab */}
      {activeTab === 'log' && (
        <>
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
        </>
      )}
    </div>
  )
}
