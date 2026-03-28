import type { Metadata } from 'next'
import Link from 'next/link'
import { getStaff, type Staff } from '@/lib/data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Staff Directory',
  description:
    'Meet the coaching staff and age group coordinators behind Elk Grove Soccer. Experienced coaches dedicated to player development at every level.',
}

const agcData = [
  { name: 'Keith Stephen', ageGroup: 'U16', birthYears: '2007/2006' },
  { name: 'Dave Groves', ageGroup: 'U16 & U19', birthYears: '2003–2007' },
  { name: 'William Newsom', ageGroup: 'U14', birthYears: '2008/2009' },
  { name: 'Jason Greer', ageGroup: 'U12', birthYears: '2010' },
  { name: 'Dan Templeton', ageGroup: 'U11', birthYears: '2011' },
  { name: 'Babak Amali', ageGroup: 'U10', birthYears: '2012' },
  { name: 'Patsy Consenza', ageGroup: 'U9', birthYears: '2013' },
  { name: 'Alex Herman', ageGroup: 'U8', birthYears: '2014' },
]

function StaffCard({ member }: { member: Staff }) {
  const initials = member.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-leaf/[0.15] border border-leaf/[0.2] flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-leaf">{initials}</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-cloud leading-tight">{member.name}</h3>
          <p className="text-sm text-leaf font-medium">{member.role}</p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-cloud/60 leading-relaxed">{member.bio}</p>

      {/* Contact */}
      {(member.email || member.phone) && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-white/[0.06]">
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1.5 text-xs text-cloud/45 hover:text-leaf transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {member.email}
            </a>
          )}
          {member.phone && (
            <a
              href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}
              className="inline-flex items-center gap-1.5 text-xs text-cloud/45 hover:text-leaf transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 .18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {member.phone}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default async function StaffPage() {
  const staff = await getStaff()

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine to-midnight px-4 pt-12 pb-14 md:pt-20 md:pb-20">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-60 rounded-full blur-3xl bg-leaf/[0.06]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Staff Directory
          </div>

          <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-bold leading-none tracking-tight mb-3 bg-gradient-to-r from-leaf to-aqua bg-clip-text text-transparent">
            Meet the Team
          </h1>
          <p className="text-lg text-cloud/60 mb-8">
            Licensed coaches, dedicated volunteers, and experienced coordinators — all committed to your player&apos;s growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#coaching-staff"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Coaching Staff
            </Link>
            <Link
              href="#age-group-coordinators"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Age Group Coordinators
            </Link>
          </div>
        </div>
      </section>

      {/* ── Coaching Staff ────────────────────────────────────── */}
      <section id="coaching-staff" className="px-4 py-14 md:py-20 bg-midnight scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Coaches</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-3">Coaching Staff</h2>
            <p className="text-cloud/55 text-base max-w-xl">
              Our coaching team brings years of playing and coaching experience to every session — from Future Stars to Academy.
            </p>
          </div>

          {staff.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {staff.map((member) => (
                <StaffCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-8 text-center">
              <p className="text-cloud/40">Coaching staff profiles coming soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Age Group Coordinators ────────────────────────────── */}
      <section id="age-group-coordinators" className="px-4 py-14 md:py-20 bg-pine/30 border-t border-white/[0.06] scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Coordinators</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-3">Age Group Coordinators</h2>
            <p className="text-cloud/55 text-base max-w-xl">
              Your first point of contact for scheduling, team placement, and questions about your player&apos;s age group.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agcData.map((agc) => (
              <div
                key={agc.name}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-sunset/[0.15] border border-sunset/[0.2] flex items-center justify-center">
                  <span className="text-sm font-bold text-sunset">
                    {agc.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-cloud">{agc.name}</h3>
                  <p className="text-sm text-sunset font-semibold">{agc.ageGroup}</p>
                  <p className="text-xs text-cloud/40 mt-0.5">Birth years: {agc.birthYears}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-sm text-cloud/55 leading-relaxed">
              <span className="font-semibold text-cloud/70">Not sure who to contact?</span>{' '}
              Email{' '}
              <a href="mailto:registrar@elkgrovesoccer.com" className="text-leaf hover:text-neon underline underline-offset-2 transition-colors">
                registrar@elkgrovesoccer.com
              </a>{' '}
              and we&apos;ll connect you with the right coordinator for your player&apos;s age group.
            </p>
          </div>
        </div>
      </section>

      {/* ── Join the Team CTA ─────────────────────────────────── */}
      <section className="px-4 py-14 bg-midnight">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-cloud mb-3">Interested in coaching?</h2>
          <p className="text-cloud/55 text-base mb-8 leading-relaxed">
            We&apos;re always looking for passionate volunteers. Whether you&apos;ve coached before or just love the game, there&apos;s a place for you.
          </p>
          <a
            href="mailto:coaching@elkgrovesoccer.com"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-leaf to-sunset text-midnight font-bold rounded-2xl py-4 px-8 text-base hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </>
  )
}
