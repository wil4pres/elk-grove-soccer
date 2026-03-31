import type { Metadata } from 'next'
import ContactForm from './_components/contact-form'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Elk Grove Soccer. Questions about registration, field status, volunteering, or sponsorship — we\'re here to help.',
}

const contactInfo = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 .18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    label: 'Phone',
    value: '(916) 555-0180',
    href: 'tel:+19165550180',
    note: 'Game-day field hotline: 7 AM onwards',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    label: 'Email',
    value: 'info@elkgrovesoccer.com',
    href: 'mailto:info@elkgrovesoccer.com',
    note: 'Response within 1–2 business days',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: 'Based in',
    value: 'Elk Grove, CA',
    href: 'https://maps.google.com/?q=Elk+Grove,+CA',
    note: 'Serving the greater Sacramento area',
  },
]

export default function ContactPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine to-midnight px-4 pt-12 pb-14 md:pt-20 md:pb-20">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-60 rounded-full blur-3xl bg-leaf/[0.07]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-leaf" />
            Elk Grove Soccer
          </div>
          <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold leading-none tracking-tight mb-4 bg-gradient-to-br from-cloud to-aqua bg-clip-text text-transparent">
            Get in touch
          </h1>
          <p className="text-lg text-cloud/60 max-w-xl mx-auto">
            Questions about registration, fields, volunteering, or sponsorship — we&apos;re here to help.
          </p>
        </div>
      </section>

      {/* ── Contact info + Form ────────────────────────────── */}
      <section className="px-4 py-14 bg-midnight">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 items-start">

          {/* Left column — contact details */}
          <div>
            <h2 className="text-xl font-bold text-cloud mb-6">Contact info</h2>
            <div className="flex flex-col gap-4 mb-10">
              {contactInfo.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-4 hover:border-leaf/[0.25] hover:bg-white/[0.06] transition-colors"
                >
                  <span className="mt-0.5 text-leaf shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-cloud/40 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-sm font-semibold text-cloud group-hover:text-aqua transition-colors">{item.value}</p>
                    <p className="text-xs text-cloud/40 mt-0.5">{item.note}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Office hours */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-cloud mb-3">Office hours</h3>
              <ul className="flex flex-col gap-2">
                {[
                  { day: 'Monday – Friday', hours: '9:00 AM – 5:00 PM' },
                  { day: 'Saturday', hours: '8:00 AM – 12:00 PM (game days)' },
                  { day: 'Sunday', hours: 'Closed (email monitored)' },
                ].map((row) => (
                  <li key={row.day} className="flex justify-between items-center text-sm">
                    <span className="text-cloud/50">{row.day}</span>
                    <span className="text-cloud/80 font-medium">{row.hours}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right column — form */}
          <div>
            <h2 className="text-xl font-bold text-cloud mb-6">Send us a message</h2>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 sm:p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick links ───────────────────────────────────── */}
      <section className="px-4 py-14 bg-pine/30 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Looking for something specific?</p>
          <h2 className="text-2xl font-bold text-cloud mb-8">Common questions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Field Status', desc: 'Is my field open today?', href: '/field-status', color: 'text-leaf' },
              { label: 'Programs', desc: 'Find the right program for your player', href: '/programs', color: 'text-aqua' },
              { label: 'Register', desc: 'Sign up for Spring 2026', href: '/register', color: 'text-sunset' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 text-left hover:border-white/[0.15] hover:bg-white/[0.06] transition-colors group"
              >
                <p className={`text-sm font-bold mb-1 ${item.color} group-hover:opacity-80 transition-opacity`}>{item.label}</p>
                <p className="text-xs text-cloud/50">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
