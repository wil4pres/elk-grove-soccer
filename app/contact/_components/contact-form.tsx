'use client'

import { useEffect, useRef, useState } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

const TOPICS = [
  'General Inquiry',
  'Registration Help',
  'Field Status Question',
  'Schedule Question',
  'Volunteering',
  'Sponsorship / Partnership',
  'Coaching Staff',
  'Other',
]

type FormState = 'idle' | 'submitting' | 'success' | 'error'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
    }
  }
}

export default function ContactForm() {
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string>('')

  useEffect(() => {
    const scriptId = 'cf-turnstile-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    } else {
      renderWidget()
    }

    return () => {
      // Leave script in DOM to avoid re-download on navigation
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function renderWidget() {
    if (!turnstileRef.current || !window.turnstile) return
    if (widgetIdRef.current !== null) return
    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => {
        tokenRef.current = token
      },
      'expired-callback': () => {
        tokenRef.current = ''
      },
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state === 'submitting') return

    const form = e.currentTarget
    const data = new FormData(form)

    const turnstileToken = tokenRef.current
    if (!turnstileToken) {
      setErrorMsg('Please complete the security check.')
      setState('error')
      return
    }

    setState('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || undefined,
          topic: data.get('topic'),
          message: data.get('message'),
          honeypot: data.get('website'), // hidden field
          turnstileToken,
        }),
      })

      const json = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Something went wrong.')
      }

      setState('success')
      form.reset()
      tokenRef.current = ''
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send. Please try again.')
      setState('error')
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
      tokenRef.current = ''
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-leaf/[0.08] border border-leaf/[0.2] rounded-3xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-leaf/[0.15] flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-leaf">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-cloud mb-2">Message sent!</h3>
        <p className="text-sm text-cloud/60 mb-6">We&apos;ll get back to you within 1–2 business days.</p>
        <button
          onClick={() => setState('idle')}
          className="text-sm font-semibold text-leaf hover:text-aqua transition-colors"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot — hidden from real users */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute opacity-0 h-0 w-0 overflow-hidden pointer-events-none" />

      {/* Name + Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-xs font-semibold text-cloud/50 uppercase tracking-wider">
            Name <span className="text-rose">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Jane Smith"
            className="bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-cloud placeholder:text-cloud/25 focus:outline-none focus:border-leaf/[0.5] focus:ring-1 focus:ring-leaf/[0.3] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-cloud/50 uppercase tracking-wider">
            Email <span className="text-rose">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jane@example.com"
            className="bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-cloud placeholder:text-cloud/25 focus:outline-none focus:border-leaf/[0.5] focus:ring-1 focus:ring-leaf/[0.3] transition-colors"
          />
        </div>
      </div>

      {/* Phone + Topic row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-xs font-semibold text-cloud/50 uppercase tracking-wider">
            Phone <span className="text-cloud/30">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(916) 555-0100"
            className="bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-cloud placeholder:text-cloud/25 focus:outline-none focus:border-leaf/[0.5] focus:ring-1 focus:ring-leaf/[0.3] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic" className="text-xs font-semibold text-cloud/50 uppercase tracking-wider">
            Topic <span className="text-rose">*</span>
          </label>
          <select
            id="topic"
            name="topic"
            required
            defaultValue=""
            className="bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-cloud focus:outline-none focus:border-leaf/[0.5] focus:ring-1 focus:ring-leaf/[0.3] transition-colors appearance-none"
          >
            <option value="" disabled className="bg-pine text-cloud/50">Select a topic…</option>
            {TOPICS.map((t) => (
              <option key={t} value={t} className="bg-pine text-cloud">{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-xs font-semibold text-cloud/50 uppercase tracking-wider">
          Message <span className="text-rose">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us how we can help…"
          className="bg-white/[0.05] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-cloud placeholder:text-cloud/25 focus:outline-none focus:border-leaf/[0.5] focus:ring-1 focus:ring-leaf/[0.3] transition-colors resize-none"
        />
      </div>

      {/* Cloudflare Turnstile */}
      <div ref={turnstileRef} className="min-h-[65px]" />

      {/* Error message */}
      {state === 'error' && errorMsg && (
        <p className="text-sm text-rose bg-rose/[0.08] border border-rose/[0.2] rounded-2xl px-4 py-3">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full bg-leaf text-white font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-leaf/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'submitting' ? 'Sending…' : 'Send message'}
      </button>

      <p className="text-xs text-cloud/30 text-center">
        We respond within 1–2 business days.
      </p>
    </form>
  )
}
