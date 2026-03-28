import type { Metadata } from 'next'
import Link from 'next/link'
import ProgramCard from '@/components/program-card'
import { getPrograms } from '@/lib/data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Register for Elk Grove Soccer Spring 2026. Programs for ages 4–16 — recreational, select, academy, camps, and more.',
}

const faq = [
  {
    q: 'When does registration close?',
    a: 'Each program closes when it reaches capacity or by March 28, 2026 — whichever comes first. Academy Navy and 11U Select fill quickly. Register early to secure your spot.',
  },
  {
    q: 'Can I register for more than one program?',
    a: 'Yes. Players may register for a primary program (Rec, Select, or Academy) plus any Camps & Clinics offerings. Note that Select and Academy training schedules may overlap.',
  },
  {
    q: 'Are scholarships available?',
    a: 'Yes. Financial assistance is available for all programs. Contact registrar@elkgrovesoccer.com with subject line "Aid Request" before completing registration.',
  },
  {
    q: 'What is the refund policy?',
    a: 'Full refunds are available up to 14 days before the season start date. After that, a $50 processing fee applies. No refunds after the season begins.',
  },
  {
    q: 'Do select and academy programs require a tryout?',
    a: 'Select programs require a coach evaluation (free, held in March). Academy Navy requires a formal tryout. Recreational and Future Stars are open enrollment — no tryout.',
  },
  {
    q: 'What if my child\'s program is full?',
    a: 'You can join the waitlist and we\'ll notify you if a spot opens. Waitlist families are also first to hear about new roster openings mid-season.',
  },
]

export default async function RegisterPage() {
  const allPrograms = await getPrograms()
  const openPrograms = allPrograms.filter((p) => p.registrationStatus === 'open')
  const opensSoonPrograms = allPrograms.filter((p) => p.registrationStatus === 'opens-soon')
  const closedPrograms = allPrograms.filter(
    (p) => p.registrationStatus === 'waitlist' || p.registrationStatus === 'closed'
  )
  return (
    <>
      {/* ── Page Hero ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine to-midnight px-4 pt-14 pb-16 md:pt-20 md:pb-20">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 right-0 w-96 h-96 bg-sunset/[0.06] rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-leaf animate-pulse" />
            Registration Open · Spring 2026
          </div>
          <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-bold leading-tight tracking-tight text-cloud mb-4">
            Find your spot on the field.
          </h1>
          <p className="text-lg text-cloud/60 max-w-xl mx-auto mb-8 leading-relaxed">
            Elk Grove Soccer offers programs for every age and commitment level — from first kicks to college pathways. Spots fill fast.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/programs"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Not sure which program? Find yours &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Open Now ──────────────────────────────────────────── */}
      <section className="px-4 py-14 bg-midnight">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-leaf/[0.15] text-leaf border border-leaf/[0.25] text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-leaf animate-pulse" />
              Open Now
            </span>
            <h2 className="text-2xl font-bold text-cloud">{openPrograms.length} programs accepting players</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {openPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Opens Soon ──────────────────────────────────────── */}
      {opensSoonPrograms.length > 0 && (
        <section className="px-4 py-12 bg-pine/25 border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sunset/[0.15] text-sunset border border-sunset/[0.25] text-xs font-bold">
                Coming Soon
              </span>
              <h2 className="text-2xl font-bold text-cloud">Opening soon</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {opensSoonPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Closed / Waitlist ──────────────────────────────── */}
      {closedPrograms.length > 0 && (
        <section className="px-4 py-12 bg-midnight border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/[0.06] text-cloud/40 border border-white/[0.08] text-xs font-bold">
                Closed / Waitlist
              </span>
              <h2 className="text-lg font-bold text-cloud/50">No longer accepting registrations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Program Finder Teaser ──────────────────────────── */}
      <section className="px-4 py-14 bg-pine/40 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 md:p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-aqua/20 to-neon/10 border border-aqua/20 flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-aqua">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-cloud mb-3">Not sure which program fits?</h2>
            <p className="text-cloud/60 text-base leading-relaxed mb-6 max-w-md mx-auto">
              Answer three quick questions about your child&apos;s age, experience, and schedule — we&apos;ll point you to the right fit.
            </p>
            <Link
              href="/programs"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-leaf to-sunset text-midnight font-bold rounded-2xl py-4 px-8 text-base hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Find the right program &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="px-4 py-14 bg-midnight border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">FAQ</p>
            <h2 className="text-2xl font-bold text-cloud">Registration questions</h2>
          </div>
          <div className="flex flex-col gap-4">
            {faq.map((item) => (
              <div key={item.q} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-cloud mb-2">{item.q}</h3>
                <p className="text-sm text-cloud/60 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 bg-leaf/[0.08] border border-leaf/[0.2] rounded-2xl">
            <p className="text-sm text-cloud/70 leading-relaxed">
              <span className="font-bold text-leaf">Still have questions?</span>{' '}
              Email <a href="mailto:registrar@elkgrovesoccer.com" className="text-leaf underline underline-offset-2">registrar@elkgrovesoccer.com</a> or call{' '}
              <a href="tel:+19165550180" className="text-leaf underline underline-offset-2">(916) 555-0180</a> Monday–Friday, 9 AM–5 PM.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
