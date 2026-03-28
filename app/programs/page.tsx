import type { Metadata } from 'next'
import Link from 'next/link'
import ProgramCard from '@/components/program-card'
import { getPrograms } from '@/lib/data'
import type { ProgramLevel } from '@/lib/programs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Programs',
  description: 'Find the right Elk Grove Soccer program. Future Stars, Recreational, Select, Academy, and Camps & Clinics — ages 4 to 16.',
}

// Quiz chips — static UI placeholder for the program finder
const quizSteps = [
  {
    question: "How old is your player?",
    chips: ['4–6', '7–9', '10–12', '13–16'],
  },
  {
    question: "What's their soccer experience?",
    chips: ['Just starting', 'Played a season or two', 'Experienced player', 'Highly competitive'],
  },
  {
    question: "How much time can you commit?",
    chips: ['Weekends only', '2–3 days/week', '4+ days + travel', 'Just one week (camp)'],
  },
]

interface LevelSection {
  id: ProgramLevel
  label: string
  tagline: string
  color: string
  borderColor: string
  bg: string
  dotColor: string
  description: string
  whoIsItFor: string
  commitment: string
  tryout: string
}

const levelSections: LevelSection[] = [
  {
    id: 'future-stars',
    label: 'Future Stars',
    tagline: 'Ages 4–6 · U5–U7',
    color: 'text-aqua',
    borderColor: 'border-aqua/[0.2]',
    bg: 'bg-aqua/[0.05]',
    dotColor: 'bg-aqua',
    description: "Soccer is a game, and at this age it should feel like one. Future Stars is a parent-friendly, low-pressure introduction to the sport — dribbling, kicking, and most importantly, having fun together.",
    whoIsItFor: 'First-time players ages 4–6 who want to explore soccer in a welcoming, playful environment.',
    commitment: '1 day per week · Saturdays',
    tryout: 'Open enrollment — no tryout required',
  },
  {
    id: 'recreational',
    label: 'Recreational',
    tagline: 'Ages 7–12 · U8–U12',
    color: 'text-leaf',
    borderColor: 'border-leaf/[0.2]',
    bg: 'bg-leaf/[0.05]',
    dotColor: 'bg-leaf',
    description: "Our Recreational program is the heart of Elk Grove Soccer. Local leagues, weekend games, and a community of families who love the sport. No tryouts, no pressure — just great soccer.",
    whoIsItFor: 'Players ages 7–12 who want to play, improve, and have fun without the demands of competitive travel soccer.',
    commitment: 'Weekends only · 1–2 games per week',
    tryout: 'Open enrollment — no tryout required',
  },
  {
    id: 'select',
    label: 'Select',
    tagline: 'Ages 10+ · U11 and up',
    color: 'text-sunset',
    borderColor: 'border-sunset/[0.2]',
    bg: 'bg-sunset/[0.05]',
    dotColor: 'bg-sunset',
    description: "Ready to level up? Select is for motivated players who want structured training, a real coaching staff, and the chance to compete at the regional level — without the full commitment of Academy.",
    whoIsItFor: 'Players ages 10+ who are motivated to improve and want to compete more seriously, with 2–3 practices per week.',
    commitment: '3 days/week · Tue/Thu training + weekends',
    tryout: 'Coach evaluation required (free, held in March)',
  },
  {
    id: 'academy',
    label: 'Academy',
    tagline: 'Ages 12–16 · U13–U16',
    color: 'text-rose',
    borderColor: 'border-rose/[0.2]',
    bg: 'bg-rose/[0.05]',
    dotColor: 'bg-rose',
    description: "Academy is our highest-performance pathway — built for players with college or professional aspirations. GPS tracking, college advisory, regional travel, and coaching modeled after top academies in California.",
    whoIsItFor: 'Dedicated players ages 12–16 who are serious about the game and are prepared for the commitment of high-level competitive soccer.',
    commitment: '3–4 days/week + regional travel on weekends',
    tryout: 'Formal tryout required · Scholarships available',
  },
  {
    id: 'camps',
    label: 'Camps & Clinics',
    tagline: 'All ages · Seasonal',
    color: 'text-amber',
    borderColor: 'border-amber/[0.2]',
    bg: 'bg-amber/[0.05]',
    dotColor: 'bg-amber',
    description: "Short-term, high-impact training for any player. Whether it's our week-long Summer Intensive, the biweekly Goalkeeper Academy, or a specialty skills clinic — Camps are a great way to improve without a season-long commitment.",
    whoIsItFor: 'Any player looking to develop specific skills, try something new, or stay sharp during the off-season.',
    commitment: 'Varies by program — single week to biweekly sessions',
    tryout: 'Open enrollment — no tryout required',
  },
]

const commitmentGuide = [
  { level: 'Future Stars', days: '1 day/week', travel: 'None', tryout: 'No', price: '$95' },
  { level: 'Recreational', days: 'Weekends', travel: 'Local only', tryout: 'No', price: '$195' },
  { level: 'Select', days: '3 days/week', travel: 'Regional', tryout: 'Eval', price: '$325' },
  { level: 'Academy', days: '4 days/week', travel: 'Statewide', tryout: 'Yes', price: '$480' },
  { level: 'Camps', days: 'Varies', travel: 'None', tryout: 'No', price: 'From $95' },
]

export default async function ProgramsPage() {
  const allPrograms = await getPrograms()
  return (
    <>
      {/* ── Page Hero ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine to-midnight px-4 pt-14 pb-16 md:pt-20 md:pb-20">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-0 w-96 h-96 bg-leaf/[0.07] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-aqua/[0.05] rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
            Spring 2026 · 6 programs available
          </div>
          <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-bold leading-tight tracking-tight text-cloud mb-4">
            Find the right program<br className="hidden sm:block" /> for your player.
          </h1>
          <p className="text-lg text-cloud/60 max-w-xl mx-auto leading-relaxed">
            Every Elk Grove player has a path — from first kicks at age 4 to college scholarships at 16. Use the guide below to find the right fit.
          </p>
        </div>
      </section>

      {/* ── Program Finder Teaser ──────────────────────────── */}
      <section className="px-4 py-12 bg-pitch/30 border-b border-white/[0.06]" id="finder">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Program Finder</p>
            <h2 className="text-2xl font-bold text-cloud">Answer 3 quick questions</h2>
            <p className="text-cloud/55 text-sm mt-1">We&apos;ll match your child to the right program.</p>
          </div>
          <div className="flex flex-col gap-6">
            {quizSteps.map((step, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-cloud/70 mb-3">
                  <span className="text-leaf mr-2">{i + 1}.</span>{step.question}
                </p>
                <div className="flex flex-wrap gap-2">
                  {step.chips.map((chip) => (
                    <button
                      key={chip}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-cloud/70 font-medium hover:bg-white/[0.1] hover:text-cloud hover:border-leaf/[0.3] active:scale-[0.97] transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-cloud/30 text-center">
            Full interactive program finder coming soon. For now,{' '}
            <a href="mailto:registrar@elkgrovesoccer.com" className="text-leaf underline underline-offset-2">
              email us
            </a>{' '}
            and we&apos;ll help you find the right fit.
          </p>
        </div>
      </section>

      {/* ── Commitment Guide ──────────────────────────────── */}
      <section className="px-4 py-12 bg-midnight border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">At a glance</p>
            <h2 className="text-2xl font-bold text-cloud">Commitment guide</h2>
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[540px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {['Program', 'Training days', 'Travel', 'Tryout', 'Starting at'].map((col) => (
                    <th key={col} className="text-left py-3 pr-6 text-xs font-semibold uppercase tracking-wider text-cloud/35 first:pl-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commitmentGuide.map((row, i) => (
                  <tr key={row.level} className={`border-b ${i === commitmentGuide.length - 1 ? 'border-transparent' : 'border-white/[0.06]'}`}>
                    <td className="py-3.5 pr-6 font-semibold text-cloud">{row.level}</td>
                    <td className="py-3.5 pr-6 text-cloud/60">{row.days}</td>
                    <td className="py-3.5 pr-6 text-cloud/60">{row.travel}</td>
                    <td className="py-3.5 pr-6 text-cloud/60">{row.tryout}</td>
                    <td className="py-3.5 font-semibold text-leaf">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Program Sections ──────────────────────────────── */}
      {levelSections.map((section) => {
        const programs = allPrograms.filter((p) => p.level === section.id)
        return (
          <section
            key={section.id}
            id={section.id}
            className="px-4 py-16 md:py-20 border-b border-white/[0.06] even:bg-pine/25 odd:bg-midnight"
          >
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-start">
                {/* Left — description */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`w-2 h-2 rounded-full ${section.dotColor}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${section.color}`}>
                      {section.tagline}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-4">{section.label}</h2>
                  <p className="text-base text-cloud/65 leading-relaxed mb-6 max-w-lg">
                    {section.description}
                  </p>
                  <div className={`${section.bg} border ${section.borderColor} rounded-2xl p-5 flex flex-col gap-3`}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-0.5">Who it&apos;s for</p>
                      <p className="text-sm text-cloud/70 leading-relaxed">{section.whoIsItFor}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-3 border-t border-white/[0.06]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-0.5">Commitment</p>
                        <p className="text-sm text-cloud/70">{section.commitment}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-0.5">Tryout</p>
                        <p className="text-sm text-cloud/70">{section.tryout}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right — program cards */}
                <div className="w-full lg:w-[340px] flex flex-col gap-4">
                  {programs.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                  ))}
                  {programs.length === 0 && (
                    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 text-sm text-cloud/40 text-center">
                      No programs currently listed. Check back soon.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )
      })}

      {/* ── Bottom CTA ──────────────────────────────────────── */}
      <section className="px-4 py-16 bg-midnight">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-cloud mb-3">Ready to register?</h2>
          <p className="text-cloud/55 text-base mb-8 leading-relaxed">
            Registration for Spring 2026 is open now. Most programs have limited spots — secure your player&apos;s place today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-gradient-to-r from-leaf to-sunset text-midnight font-bold rounded-2xl py-4 px-8 text-base hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Register for 2026
            </Link>
            <a
              href="mailto:registrar@elkgrovesoccer.com"
              className="bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-4 px-8 text-base hover:bg-white/[0.12] transition-colors"
            >
              Email us a question
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
