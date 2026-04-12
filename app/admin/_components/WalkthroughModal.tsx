'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'egs-walkthrough-seen-2026'

const STEPS = [
  {
    icon: '👋',
    title: 'Welcome to the EGS Admin Panel',
    subtitle: 'Spring 2026 Season',
    body: "This panel manages the full Spring 2026 season — from uploading player registrations to sending team assignment emails to parents. Here's a quick walkthrough of the coordinator workflow.",
    cta: null,
  },
  {
    icon: '📊',
    title: 'Step 1 — Upload Player Data',
    subtitle: 'Data Uploads',
    body: "Start by importing the season's player registrations from PlayMetrics. Upload the Players CSV and the Registrations CSV. This populates the player database for matching.",
    cta: { label: 'Go to Data Uploads', href: '/admin/uploads' },
  },
  {
    icon: '🗂️',
    title: 'Step 2 — Run Team Matching',
    subtitle: 'Team Matching',
    body: 'Click "Generate Recommendations" to run the AI matching engine. It scores every player against available teams using proximity, sibling requests, school location, and prior team history. Results appear in the table within a few minutes.',
    cta: { label: 'Go to Team Matching', href: '/admin/matching' },
  },
  {
    icon: '📋',
    title: 'Step 3 — Review & Finalize Assignments',
    subtitle: 'Assignments',
    body: "Open the Grand Assignment Report to review every player's placement. You can override individual assignments, run a fresh assignment, or re-run while keeping your manual overrides. When the roster looks right, you're ready to notify parents.",
    cta: { label: 'Go to Assignments', href: '/admin/assignments' },
  },
  {
    icon: '📧',
    title: 'Step 4 — Send Parent Notifications',
    subtitle: 'Email Log',
    body: 'Send assignment confirmation emails to all parents. Some families receive an action-required email with Accept / Decline buttons. Replies land in the Inbox. The Email Log tracks every message sent.',
    cta: { label: 'Go to Email Log', href: '/admin/emails' },
  },
  {
    icon: '✅',
    title: "You're all set!",
    subtitle: 'Ongoing management',
    body: "The other tiles — Fields, Programs, Sponsors, Staff, Alumni, and Players — are always available for day-to-day management. The Chat assistant can help you look up players, check assignments, or answer questions mid-season.",
    cta: null,
  },
]

export default function WalkthroughModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setOpen(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  function prev() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setStep(0); setOpen(true) }}
        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
      >
        <span>📖</span> Season Walkthrough
      </button>
    )
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          <div className="text-5xl mb-5 text-center">{current.icon}</div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider text-center mb-1">
            {current.subtitle}
          </p>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-4 leading-snug">
            {current.title}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed text-center">
            {current.body}
          </p>

          {current.cta && (
            <div className="mt-5 text-center">
              <Link
                href={current.cta.href}
                onClick={dismiss}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                {current.cta.label} →
              </Link>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-blue-500' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 flex items-center justify-between gap-3">
          <button
            onClick={dismiss}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
