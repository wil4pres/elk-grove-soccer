import type { Metadata } from 'next'
import Link from 'next/link'
import { getSchedule } from '@/lib/schedule'
import ScheduleFilter from '@/components/schedule-filter'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Maps & Directions',
  description:
    'Find Cherry Island Complex and Laguna Park Complex. Google Maps, directions, parking info, and game day tips for Elk Grove Soccer families.',
}

const complexes = [
  {
    id: 'cherry-island',
    name: 'Cherry Island Complex',
    address: '6300 Bilby Rd, Elk Grove, CA 95758',
    embedUrl:
      'https://www.google.com/maps?q=6300+Bilby+Rd,+Elk+Grove,+CA+95758&output=embed',
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=6300+Bilby+Rd,+Elk+Grove,+CA+95758',
    parking:
      'Lots A and B — enter from Bilby Rd. Arrive at least 20 minutes early on game days.',
    tips: [
      'Restrooms located near the concession stand between Fields 2 and 3.',
      'Shaded seating is limited — bring a canopy or low camp chair.',
      'No dogs allowed on the field complex.',
    ],
  },
  {
    id: 'laguna-park',
    name: 'Laguna Park Complex',
    address: '9830 Waterman Rd, Elk Grove, CA 95624',
    embedUrl:
      'https://www.google.com/maps?q=9830+Waterman+Rd,+Elk+Grove,+CA+95624&output=embed',
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=9830+Waterman+Rd,+Elk+Grove,+CA+95624',
    parking:
      'Lot D — main entrance off Waterman Rd. Arrive at least 20 minutes early on game days.',
    tips: [
      'Water fountain available near the main pavilion.',
      'Overflow parking on the gravel lot east of the main entrance.',
      'Portable restrooms available on game days.',
    ],
  },
]

export default async function MapsPage() {
  const matches = await getSchedule()
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine to-midnight px-4 pt-12 pb-14 md:pt-20 md:pb-20">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-60 rounded-full blur-3xl bg-leaf/[0.06]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Maps &amp; Directions
          </div>

          <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-bold leading-none tracking-tight mb-3 bg-gradient-to-r from-leaf to-aqua bg-clip-text text-transparent">
            Find Your Field
          </h1>
          <p className="text-lg text-cloud/60 mb-8">
            Two complexes, plenty of parking, and a straight shot from anywhere in Elk Grove.
          </p>

          {/* Jump links */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#cherry-island"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Cherry Island
            </a>
            <a
              href="#laguna-park"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Laguna Park
            </a>
            <a
              href="#schedule"
              className="inline-flex items-center justify-center gap-2 bg-sunset/[0.1] border border-sunset/[0.2] text-sunset font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-sunset/[0.15] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              Schedule
            </a>
            <Link
              href="/field-status"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-leaf animate-pulse" />
              Field Status
            </Link>
          </div>
        </div>
      </section>

      {/* ── Complex Sections ──────────────────────────────────── */}
      <section className="px-4 py-14 md:py-20 bg-midnight">
        <div className="max-w-4xl mx-auto">
          {complexes.map((complex) => (
            <div
              key={complex.id}
              id={complex.id}
              className="mb-16 last:mb-0 scroll-mt-24"
            >
              {/* Section label */}
              <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">
                Complex
              </p>

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-cloud">{complex.name}</h2>
                  <p className="text-sm text-cloud/40 mt-0.5">{complex.address}</p>
                </div>
                <a
                  href={complex.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 bg-leaf/[0.1] border border-leaf/[0.2] text-leaf font-semibold rounded-2xl py-2.5 px-4 text-sm hover:bg-leaf/[0.15] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Get Directions
                </a>
              </div>

              {/* Google Maps embed */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl overflow-hidden mb-5">
                <iframe
                  src={complex.embedUrl}
                  width="100%"
                  height="350"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-[300px] md:h-[400px]"
                  title={`${complex.name} map`}
                />
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Parking */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-1">
                    Parking
                  </p>
                  <p className="text-sm text-cloud/65 leading-relaxed">
                    {complex.parking}
                  </p>
                </div>

                {/* Tips */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-2">
                    Game Day Tips
                  </p>
                  <ul className="flex flex-col gap-2">
                    {complex.tips.map((tip) => (
                      <li
                        key={tip}
                        className="flex items-start gap-2.5 text-sm text-cloud/65"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sunset shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Schedule ──────────────────────────────────────────── */}
      <section id="schedule" className="scroll-mt-24 px-4 py-14 md:py-20 bg-pine/30 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">
            Schedule
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-cloud">Match Schedule</h2>
            <p className="text-xs text-cloud/30">Updated every 5 minutes from live data</p>
          </div>

          {matches.length > 0 ? (
            <ScheduleFilter matches={matches} />
          ) : (
            <div className="bg-white/[0.04] border border-sunset/[0.2] rounded-3xl p-8 md:p-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-sunset mx-auto mb-4">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <p className="text-xl font-bold text-sunset mb-2">No Matches Scheduled</p>
              <p className="text-sm text-cloud/55 max-w-md mx-auto leading-relaxed mb-6">
                No upcoming matches found. Check back soon or follow us for updates.
              </p>
              <Link
                href="/field-status"
                className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3 px-6 text-sm hover:bg-white/[0.12] transition-colors"
              >
                Check Field Status
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── General Parking Tips ──────────────────────────────── */}
      <section className="px-4 py-14 bg-midnight">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">
            Parking
          </p>
          <h2 className="text-2xl font-bold text-cloud mb-6">General parking info</h2>

          <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6">
            <ul className="flex flex-col gap-2.5">
              {[
                'Lots A, B, and D are available for game-day parking.',
                'Arrive at least 20 minutes before kickoff to find parking and walk to the field.',
                'Carpooling is encouraged — parking fills quickly for tournament weekends.',
                'Handicap parking is available at the main entrance of each complex.',
                'Check live field status before heading out to avoid surprises.',
              ].map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-2.5 text-sm text-cloud/65"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sunset shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
