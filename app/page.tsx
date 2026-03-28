import Image from 'next/image'
import Link from 'next/link'
import FieldStatusBanner from '@/components/field-status-banner'
import Hero from '@/components/hero'
import TrustStrip from '@/components/trust-strip'
import MobileQuickActions from '@/components/mobile-quick-actions'
import ProgramCard from '@/components/program-card'
import GameDayCard from '@/components/game-day-card'
import SponsorStrip from '@/components/sponsor-strip'
import { getPrograms, getAlumni } from '@/lib/data'
import { getSchedule, filterCurrentAndFuture } from '@/lib/schedule'

export const dynamic = 'force-dynamic'

// Game day utility card content
const gameDayCards = [
  {
    title: 'Maps & Directions',
    accentColor: 'text-leaf',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    items: [
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>, label: 'Cherry Island', value: '6300 Bilby Rd, Elk Grove, CA 95758' },
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>, label: 'Laguna Park', value: '9830 Waterman Rd, Elk Grove, CA 95624' },
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, label: 'Parking', value: 'Lots A, B, and D — arrive 20 min early on game days' },
    ],
  },
  {
    title: 'Match Schedule',
    accentColor: 'text-sunset',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
    items: [] as { icon: React.ReactNode; label: string; value: string }[],
    _isSchedule: true as const,
  },
  {
    title: 'What to Bring',
    accentColor: 'text-aqua',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <rect width="20" height="14" x="2" y="6" rx="2" />
      </svg>
    ),
    items: [
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>, label: 'Gear', value: 'Cleats, shin guards, and club jersey — all required' },
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>, label: 'Hydration', value: '32 oz water bottle — NorCal sun is no joke' },
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>, label: 'For parents', value: 'Sunscreen, low camp chairs, and team snack if it\'s your week' },
    ],
  },
  {
    title: 'Weather & Rainout',
    accentColor: 'text-rose',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        <line x1="8" x2="8" y1="16" y2="22" />
        <line x1="8" x2="8" y1="22" y2="22" />
        <line x1="12" x2="12" y1="19" y2="22" />
        <line x1="16" x2="16" y1="16" y2="22" />
      </svg>
    ),
    items: [
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>, label: 'Rainout policy', value: 'Fields closed if lightning within 8 miles or standing water present' },
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 .18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, label: 'Status alerts', value: 'Check Field Status page or call (916) 555-0180 after 7 AM' },
      { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'Decision time', value: 'Game-day calls posted by 7 AM for morning games' },
    ],
  },
]

// data fetched inside component below

const levelSummaries = [
  {
    id: 'future-stars',
    label: 'Future Stars',
    ageRange: 'Ages 4–6',
    color: 'text-aqua',
    borderColor: 'border-aqua/[0.2]',
    bg: 'from-aqua/[0.08]',
    icon: '⚽',
    description: 'First touches, big smiles. Weekend sessions with parent participation.',
    href: '/programs#future-stars',
  },
  {
    id: 'recreational',
    label: 'Recreational',
    ageRange: 'Ages 7–12',
    color: 'text-leaf',
    borderColor: 'border-leaf/[0.2]',
    bg: 'from-leaf/[0.08]',
    icon: '🟢',
    description: 'No tryouts. Weekend games, local pods, and a love for the sport.',
    href: '/programs#recreational',
  },
  {
    id: 'select',
    label: 'Select',
    ageRange: 'Ages 10+',
    color: 'text-sunset',
    borderColor: 'border-sunset/[0.2]',
    bg: 'from-sunset/[0.08]',
    icon: '⭐',
    description: 'Structured training and competitive fixtures. Step up your game.',
    href: '/programs#select',
  },
  {
    id: 'academy',
    label: 'Academy',
    ageRange: 'Ages 12–16',
    color: 'text-rose',
    borderColor: 'border-rose/[0.2]',
    bg: 'from-rose/[0.08]',
    icon: '🏆',
    description: 'High-performance pathway with college advisory and regional travel.',
    href: '/programs#academy',
  },
  {
    id: 'camps',
    label: 'Camps & Clinics',
    ageRange: 'All ages',
    color: 'text-amber',
    borderColor: 'border-amber/[0.2]',
    bg: 'from-amber/[0.08]',
    icon: '🎯',
    description: 'Summer intensives, goalkeeper training, and specialty clinics.',
    href: '/programs#camps',
  },
]

function formatMatchDate(iso: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default async function HomePage() {
  const [allPrograms, alumni, matches] = await Promise.all([getPrograms(), getAlumni(), getSchedule()])
  const openPrograms = allPrograms.filter((p) => p.registrationStatus === 'open').slice(0, 3)

  // Build live schedule card — only current/future matches
  const upcoming = filterCurrentAndFuture(matches)
  const arrowIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
  const scheduleItems = upcoming.length > 0
    ? [
        ...(upcoming.slice(0, 2).map((m, i) => ({
          icon: arrowIcon,
          label: i === 0 ? 'Next game' : 'Following',
          value: `${formatMatchDate(m.date)} ${m.time} · ${m.homeTeam} vs ${m.awayTeam || m.awayClub} · ${m.location}`,
        }))),
        { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'Full schedule', value: `${upcoming.length} upcoming matches → Maps & Schedules` },
      ]
    : [
        { icon: arrowIcon, label: 'Schedule', value: 'No upcoming matches scheduled' },
        { icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'Full schedule', value: 'Check Maps & Schedules for updates' },
      ]

  const allGameDayCards = gameDayCards.map(c =>
    '_isSchedule' in c ? { ...c, items: scheduleItems } : c
  )
  return (
    <>
      <FieldStatusBanner />
      <Hero />
      <TrustStrip />
      <MobileQuickActions />

      {/* ── Open Registration ──────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20 bg-midnight">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Registration</p>
              <h2 className="text-3xl md:text-4xl font-bold text-cloud">Open now · 2026 Season</h2>
              <p className="text-cloud/55 mt-2 text-base max-w-md">
                Spots are limited. Secure your player&apos;s place before registration closes.
              </p>
            </div>
            <Link
              href="/register"
              className="shrink-0 text-sm font-semibold text-leaf hover:text-neon transition-colors whitespace-nowrap"
            >
              View all programs &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {openPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Programs by Level ──────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20 bg-pine/40">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Programs</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-3">A program for every player</h2>
            <p className="text-cloud/55 text-base max-w-xl">
              From a child&apos;s first kick to a college scholarship. Every Elk Grove player has a path.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {levelSummaries.map((level) => (
              <Link
                key={level.id}
                href={level.href}
                className={`bg-gradient-to-b ${level.bg} to-transparent border ${level.borderColor} rounded-3xl p-5 flex flex-col gap-3 hover:border-opacity-60 active:scale-[0.97] transition-all`}
              >
                <div className="text-2xl">{level.icon}</div>
                <div>
                  <p className={`text-sm font-bold ${level.color} mb-0.5`}>{level.label}</p>
                  <p className="text-xs text-cloud/40 font-medium">{level.ageRange}</p>
                </div>
                <p className="text-xs text-cloud/60 leading-relaxed">{level.description}</p>
                <span className={`text-xs font-semibold ${level.color} mt-auto`}>
                  Learn more &rarr;
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/programs"
              className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.1] transition-colors"
            >
              Compare all programs &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Photo Gallery ──────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20 bg-midnight overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Community</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud">Players in action</h2>
          </div>

          {/* Collage grid — mobile: 2 col, desktop: 3 col mosaic */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:grid-rows-[280px_280px_220px]">
            {/* Tall feature photo — spans 2 rows on desktop */}
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] md:aspect-auto md:row-span-2">
              <Image src="/photos/action2.jpg" alt="Elk Grove Soccer player dribbling" fill className="object-cover object-center hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/40 to-transparent" />
            </div>

            {/* Top-right two */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] md:aspect-auto">
              <Image src="/photos/action1.jpg" alt="Young players on the ball" fill className="object-cover object-top hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/30 to-transparent" />
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] md:aspect-auto">
              <Image src="/photos/action3.jpg" alt="EGS player kicking" fill className="object-cover object-center hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/30 to-transparent" />
            </div>

            {/* Middle-right two */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] md:aspect-auto">
              <Image src="/photos/action4.jpg" alt="Players racing for the ball" fill className="object-cover object-center hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/30 to-transparent" />
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] md:aspect-auto">
              <Image src="/photos/team.jpg" alt="EGS team photo with coach" fill className="object-cover object-center hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/30 to-transparent" />
            </div>

            {/* Bottom row — wide shot spans 2 cols */}
            <div className="relative rounded-2xl overflow-hidden aspect-[16/9] col-span-2 md:col-span-2 md:aspect-auto">
              <Image src="/photos/action5.jpg" alt="EGS player breaking away" fill className="object-cover object-[center_40%] hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 100vw, 66vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/40 to-transparent" />
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] md:aspect-auto">
              <Image src="/photos/action6.jpg" alt="Competitive play at EGS" fill className="object-cover object-center hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/30 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Game Day Utility ──────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20 bg-midnight">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Game Day</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-3">Everything you need on the sideline</h2>
            <p className="text-cloud/55 text-base max-w-xl">
              Fast answers for busy parents. No searching, no calling — just the info you need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allGameDayCards.map((card) => (
              <GameDayCard
                key={card.title}
                title={card.title}
                icon={card.icon}
                items={card.items}
                accentColor={card.accentColor}
              />
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/maps"
              className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.1] transition-colors"
            >
              Full maps, schedules &amp; parking &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pathway to Pro ──────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20 bg-pine/40">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Alumni</p>
              <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-3">
                From Elk Grove<br className="hidden sm:block" /> to the pros.
              </h2>
              <p className="text-cloud/55 text-base max-w-xl">
                Our alumni are playing at the highest levels — college, professional, and international.
                Every journey started right here.
              </p>
            </div>
            <Link
              href="/alumni"
              className="shrink-0 text-sm font-semibold text-leaf hover:text-neon transition-colors whitespace-nowrap"
            >
              See all alumni &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {alumni.map((alumnus) => (
              <article
                key={alumnus.id}
                className="bg-white/[0.05] border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-cloud leading-tight">{alumnus.name}</h3>
                    <p className="text-sm text-leaf font-semibold mt-0.5">
                      {alumnus.currentRole} · {alumnus.currentOrg}
                    </p>
                    <p className="text-xs text-cloud/35 mt-0.5">Class of {alumnus.gradYear}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pitch to-midnight border border-white/[0.08] flex items-center justify-center shrink-0">
                    <span className="text-leaf font-bold text-sm">
                      {alumnus.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="text-sm text-cloud/65 leading-relaxed italic border-l-2 border-leaf/40 pl-3">
                  &ldquo;{alumnus.quote}&rdquo;
                </blockquote>

                {/* Milestones */}
                <ul className="flex flex-col gap-2">
                  {alumnus.milestones.slice(0, 3).map((m) => (
                    <li key={m.year} className="flex items-start gap-2 text-xs text-cloud/55">
                      <span className="text-leaf/60 font-bold shrink-0 w-10">{m.year}</span>
                      <span className="leading-snug">{m.achievement}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SponsorStrip />
    </>
  )
}
