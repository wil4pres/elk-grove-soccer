import Image from 'next/image'
import Link from 'next/link'
import { getFields, computeFieldSummary } from '@/lib/data'
import { getSchedule, filterCurrentAndFuture, matchTimestamp } from '@/lib/schedule'

function formatMatchDate(iso: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default async function Hero() {
  const [fields, matches] = await Promise.all([getFields(), getSchedule()])
  const summary = computeFieldSummary(fields)

  // Find next upcoming match or currently live (within 1hr of kickoff)
  const today = new Date().toISOString().slice(0, 10)
  const now = Date.now()
  const ONE_HOUR = 60 * 60 * 1000
  const upcoming = filterCurrentAndFuture(matches)
  const nextMatch = upcoming[0] ?? null
  const isLive = nextMatch ? matchTimestamp(nextMatch.date, nextMatch.time) <= now && matchTimestamp(nextMatch.date, nextMatch.time) + ONE_HOUR > now : false

  const statusColors = {
    open: { dot: 'bg-leaf', text: 'text-leaf', pill: 'bg-leaf/[0.12] border-leaf/[0.2]', label: 'All Fields Open' },
    delay: { dot: 'bg-sunset', text: 'text-sunset', pill: 'bg-sunset/[0.12] border-sunset/[0.2]', label: 'Delay at Cherry Island' },
    closed: { dot: 'bg-rose', text: 'text-rose', pill: 'bg-rose/[0.12] border-rose/[0.2]', label: 'Some Fields Closed' },
  }
  const sc = statusColors[summary.status]

  return (
    <section className="relative overflow-hidden bg-midnight">
      {/* Background photo */}
      <Image
        src="/photos/hero.jpg"
        alt=""
        fill
        className="object-cover object-[center_35%] opacity-20"
        priority
        sizes="100vw"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-pine/80 via-midnight/70 to-midnight pointer-events-none" />
      {/* Decorative glow blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-leaf/[0.07] rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/4" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-aqua/[0.05] rounded-full blur-3xl pointer-events-none translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-turf/[0.08] rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-center">
          {/* Left column — headline + CTAs */}
          <div className="text-center lg:text-left">
            {/* Season badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-leaf"></span>
              Spring 2026 Season Now Open
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.08] tracking-tight text-cloud mb-5">
              Your team.
              <br />
              Your season.
              <br />
              <span className="bg-gradient-to-r from-leaf to-aqua bg-clip-text text-transparent">
                Right here.
              </span>
            </h1>

            {/* Sub-copy */}
            <p className="text-lg text-cloud/60 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Elk Grove Soccer — Sacramento&apos;s home for youth soccer since 2001. Programs for every player, from first kicks to college pathways.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              <Link
                href="/register"
                className="bg-gradient-to-r from-leaf to-sunset text-midnight font-bold rounded-2xl py-4 px-7 text-base hover:opacity-90 active:scale-[0.97] transition-all text-center"
              >
                Register for 2026
              </Link>
              <Link
                href="/programs"
                className="bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-4 px-7 text-base hover:bg-white/[0.12] active:scale-[0.97] transition-all text-center"
              >
                Find My Program
              </Link>
            </div>

            {/* Trust stats */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-2 text-sm text-cloud/40 font-medium">
              <span>1,200+ players</span>
              <span className="w-1 h-1 rounded-full bg-cloud/20"></span>
              <span>45+ teams</span>
              <span className="w-1 h-1 rounded-full bg-cloud/20"></span>
              <span>Est. 2001</span>
              <span className="w-1 h-1 rounded-full bg-cloud/20"></span>
              <span>NorCal Premier</span>
            </div>
          </div>

          {/* Right column — status + next game cards (desktop only) */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Field status card */}
            <div className={`rounded-3xl border ${sc.pill} bg-white/[0.04] p-5`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-1">Live Field Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${sc.dot} animate-pulse shrink-0`}></span>
                    <span className={`text-lg font-bold ${sc.text}`}>{sc.label}</span>
                  </div>
                </div>
                <Link
                  href="/field-status"
                  className="text-xs font-semibold text-leaf hover:text-neon transition-colors whitespace-nowrap mt-1"
                >
                  View all &rarr;
                </Link>
              </div>
              <p className="text-sm text-cloud/60 leading-relaxed">{summary.message}</p>
              <p className="text-xs text-cloud/30 mt-2">Updated {summary.updatedAt}</p>
            </div>

            {/* Next game card */}
            {nextMatch ? (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.05] p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-1">Next Kickoff</p>
                    <p className="text-lg font-bold text-cloud">{formatMatchDate(nextMatch.date)}, {nextMatch.time}</p>
                  </div>
                  {isLive ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose/[0.15] text-rose text-xs font-bold border border-rose/[0.2] animate-pulse">
                      LIVE NOW
                    </span>
                  ) : nextMatch.date === today ? (
                    <span className="px-2.5 py-1 rounded-full bg-leaf/[0.15] text-leaf text-xs font-bold border border-leaf/[0.2]">
                      LIVE SOON
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-center">
                    <p className="font-bold text-cloud text-base">{nextMatch.homeTeam}</p>
                    <p className="text-cloud/40 text-xs mt-0.5">Elk Grove</p>
                  </div>
                  <div className="text-cloud/30 font-bold text-xl">vs</div>
                  <div className="text-center">
                    <p className="font-bold text-cloud text-base">{nextMatch.awayTeam || nextMatch.awayClub}</p>
                    <p className="text-cloud/40 text-xs mt-0.5">{nextMatch.awayClub}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-cloud/40">
                  <span>{nextMatch.location}</span>
                  <Link href="/maps#schedule" className="text-aqua hover:text-neon font-semibold transition-colors">
                    Full schedule &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.05] p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-1">Next Kickoff</p>
                <p className="text-sm text-cloud/50">No upcoming matches scheduled.</p>
                <Link href="/maps#schedule" className="text-xs text-aqua hover:text-neon font-semibold transition-colors mt-2 inline-block">
                  View schedule &rarr;
                </Link>
              </div>
            )}

            {/* Quick register teaser */}
            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-pine to-midnight p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Registration Open</p>
              <p className="text-sm text-cloud/70 mb-3 leading-relaxed">
                4 programs accepting players now. Spots fill fast.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {['bg-leaf', 'bg-aqua', 'bg-sunset', 'bg-rose'].map((c, i) => (
                    <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-pine flex items-center justify-center`}>
                      <span className="text-midnight text-xs font-bold">{['F', 'R', 'S', 'A'][i]}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className="text-xs font-bold text-midnight bg-gradient-to-r from-leaf to-sunset rounded-xl py-2 px-4 hover:opacity-90 transition-opacity"
                >
                  View open spots
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
