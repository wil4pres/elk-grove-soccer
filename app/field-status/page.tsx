import type { Metadata } from 'next'
import Link from 'next/link'
import { getFields, computeFieldSummary } from '@/lib/data'
import type { Field, FieldStatus } from '@/lib/fieldStatus'
import { getWeather } from '@/lib/weather'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Field Status',
  description: 'Live field status for all Elk Grove Soccer complexes. Updated same-day by coaches and field crew.',
}

function groupByComplex(fields: Field[]) {
  return fields.reduce<Record<string, Field[]>>((acc, field) => {
    if (!acc[field.complex]) acc[field.complex] = []
    acc[field.complex].push(field)
    return acc
  }, {})
}

const statusConfig: Record<FieldStatus, {
  label: string
  pillCss: string
  dotCss: string
  cardBorder: string
}> = {
  open: {
    label: 'Open',
    pillCss: 'bg-leaf/[0.15] text-leaf border-leaf/[0.25]',
    dotCss: 'bg-leaf',
    cardBorder: 'border-white/[0.08]',
  },
  delay: {
    label: 'Delayed',
    pillCss: 'bg-sunset/[0.15] text-sunset border-sunset/[0.25]',
    dotCss: 'bg-sunset animate-pulse',
    cardBorder: 'border-sunset/[0.25]',
  },
  closed: {
    label: 'Closed',
    pillCss: 'bg-rose/[0.15] text-rose border-rose/[0.25]',
    dotCss: 'bg-rose',
    cardBorder: 'border-rose/[0.2]',
  },
}

// Derive address and maps link from the first field that has an address in each complex
function getComplexMeta(fields: Field[]): Record<string, { address: string; mapsLink: string; parkingInfo: string; amenities: string }> {
  const meta: Record<string, { address: string; mapsLink: string; parkingInfo: string; amenities: string }> = {}
  for (const f of fields) {
    if (!meta[f.complex] && f.address) {
      meta[f.complex] = {
        address: f.address,
        mapsLink: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.address)}`,
        parkingInfo: f.parkingInfo ?? '',
        amenities: f.amenities ?? '',
      }
    }
  }
  return meta
}

const faq = [
  {
    q: 'What does "Delayed" mean?',
    a: 'A delay means the field is not yet safe to play on — usually due to standing water, lightning in the area, or a crew inspection in progress. Check back in 30 minutes or watch for an updated status.',
  },
  {
    q: 'When is the field status posted?',
    a: 'Game-day field status is posted by 7:00 AM for morning games and 90 minutes before afternoon games. Coaches and field crew update status directly.',
  },
  {
    q: 'What happens if games are cancelled?',
    a: 'Your coach will notify your team via the team app. Make-up dates are announced within 72 hours. No refunds for weather cancellations, but we always reschedule.',
  },
  {
    q: 'Who do I contact if I have questions?',
    a: 'Call the field hotline at (916) 555-0180 after 7 AM on game days, or email fieldcrew@elkgrovesoccer.com.',
  },
]

export default async function FieldStatusPage() {
  const [fields, weather] = await Promise.all([getFields(), getWeather()])
  const summary = computeFieldSummary(fields)
  const complexGroups = groupByComplex(fields)
  const complexMeta = getComplexMeta(fields)
  const sc = statusConfig[summary.status]

  const heroConfig = {
    open: {
      bg: 'from-leaf/[0.12] via-midnight to-midnight',
      border: 'border-leaf/[0.2]',
      valueCss: 'text-leaf',
      label: 'All Fields Open',
      sublabel: 'Cleared for play. Go get \'em.',
    },
    delay: {
      bg: 'from-sunset/[0.12] via-midnight to-midnight',
      border: 'border-sunset/[0.2]',
      valueCss: 'text-sunset',
      label: 'Delay in Effect',
      sublabel: 'Some fields not yet cleared. Check individual field cards below.',
    },
    closed: {
      bg: 'from-rose/[0.12] via-midnight to-midnight',
      border: 'border-rose/[0.2]',
      valueCss: 'text-rose',
      label: 'Fields Closed',
      sublabel: 'Play is suspended. Check back for updates.',
    },
  }
  const hc = heroConfig[summary.status]

  return (
    <>
      {/* ── Status Hero ──────────────────────────────────────── */}
      <section className={`relative overflow-hidden bg-gradient-to-b ${hc.bg} px-4 pt-12 pb-14 md:pt-20 md:pb-20`}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-60 rounded-full blur-3xl ${summary.status === 'open' ? 'bg-leaf/[0.07]' : summary.status === 'delay' ? 'bg-sunset/[0.07]' : 'bg-rose/[0.06]'}`} />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dotCss}`} />
            Live Field Status · Updated {summary.updatedAt}
          </div>

          {/* Status value */}
          <h1 className={`text-[clamp(3rem,10vw,6rem)] font-bold leading-none tracking-tight mb-3 ${hc.valueCss}`}>
            {hc.label}
          </h1>
          <p className="text-lg text-cloud/60 mb-6">{hc.sublabel}</p>
          <p className="text-sm text-cloud/50 mb-8 max-w-md mx-auto">{summary.message}</p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:+19165550180"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 .18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Field Hotline
            </a>
            <Link
              href="/maps"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Maps &amp; Directions
            </Link>
          </div>
        </div>
      </section>

      {/* ── Field Cards ──────────────────────────────────────── */}
      <section className="px-4 py-14 bg-midnight">
        <div className="max-w-4xl mx-auto">
          {Object.entries(complexGroups).map(([complexName, fields]) => (
            <div key={complexName} className="mb-12 last:mb-0">
              {/* Complex header */}
              {(() => {
                const meta = complexMeta[complexName]
                return (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-cloud">{complexName}</h2>
                      {meta?.address && <p className="text-sm text-cloud/40 mt-0.5">{meta.address}</p>}
                      {meta?.parkingInfo && <p className="text-xs text-cloud/30 mt-1">🅿️ {meta.parkingInfo}</p>}
                      {meta?.amenities && <p className="text-xs text-cloud/30 mt-0.5">🏟️ {meta.amenities}</p>}
                    </div>
                    {meta?.mapsLink && (
                      <div className="flex gap-2 shrink-0">
                        <a
                          href={meta.mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-leaf/[0.1] border border-leaf/[0.2] text-leaf font-semibold rounded-2xl py-2.5 px-4 text-sm hover:bg-leaf/[0.15] transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          Get directions
                        </a>
                        <a
                          href={`https://www.google.com/maps?q=${encodeURIComponent(meta.address)}&output=embed`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.12] text-cloud/70 font-semibold rounded-2xl py-2.5 px-4 text-sm hover:bg-white/[0.1] transition-colors"
                        >
                          View map
                        </a>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Field cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((field) => {
                  const cfg = statusConfig[field.status]
                  return (
                    <div
                      key={field.id}
                      className={`bg-white/[0.04] border ${cfg.cardBorder} rounded-3xl p-5 flex flex-col gap-3`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-cloud">{field.name}</h3>
                          <p className="text-xs text-cloud/35 mt-0.5">Updated {field.updatedAt} by {field.updatedBy}</p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.pillCss}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCss}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-cloud/65 leading-relaxed">{field.notes}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Weather & Rainout ──────────────────────────────────── */}
      <section className="px-4 py-14 bg-pine/30 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Weather</p>
            <h2 className="text-2xl font-bold text-cloud">Today&apos;s conditions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {weather ? (
              <>
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-1">Temperature</p>
                  <p className="text-xl font-bold text-cloud leading-tight">{weather.tempF}°F</p>
                  <p className="text-xs text-cloud/45 mt-1">{weather.tempNote}</p>
                </div>
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-1">UV Index</p>
                  <p className="text-xl font-bold text-cloud leading-tight">{weather.uvIndex} · {weather.uvLabel}</p>
                  <p className="text-xs text-cloud/45 mt-1">{weather.uvNote}</p>
                </div>
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-1">Wind</p>
                  <p className="text-xl font-bold text-cloud leading-tight">{weather.windSpeedMph} mph {weather.windDirection}</p>
                  <p className="text-xs text-cloud/45 mt-1">{weather.windNote}</p>
                </div>
              </>
            ) : (
              <div className="sm:col-span-3 bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4 text-center">
                <p className="text-sm text-cloud/45">Weather data unavailable — check back shortly.</p>
              </div>
            )}
          </div>
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6">
            <h3 className="text-base font-bold text-cloud mb-3">Rainout &amp; lightning policy</h3>
            <ul className="flex flex-col gap-2.5">
              {[
                'Games are cancelled if lightning is detected within 8 miles of the complex.',
                'Standing water or saturated turf will result in a field delay or closure.',
                'All game-day decisions are posted by 7:00 AM for morning games.',
                'In-game stoppages: 30-minute wait from last lightning strike before resuming.',
                'Cancelled games are rescheduled within 2 weeks when possible.',
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-2.5 text-sm text-cloud/65">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sunset shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="px-4 py-14 bg-midnight">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">FAQ</p>
            <h2 className="text-2xl font-bold text-cloud">Parent questions</h2>
          </div>
          <div className="flex flex-col gap-4">
            {faq.map((item) => (
              <div key={item.q} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-cloud mb-2">{item.q}</h3>
                <p className="text-sm text-cloud/60 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
