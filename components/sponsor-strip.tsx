import Link from 'next/link'
import { getSponsors } from '@/lib/data'

export default async function SponsorStrip() {
  const sponsors = await getSponsors()
  const premier = sponsors.filter(s => s.tier === 'premier')
  const community = sponsors.filter(s => s.tier === 'community')

  return (
    <section className="bg-pine/60 border-y border-white/[0.06] px-4 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Our Partners</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud">Community sponsors</h2>
          </div>
          <Link href="/sponsors#partner" className="shrink-0 text-sm font-semibold text-leaf hover:text-neon transition-colors whitespace-nowrap">
            Become a partner &rarr;
          </Link>
        </div>

        {premier.map(sponsor => (
          <div key={sponsor.id} className="mb-8 rounded-3xl p-px bg-gradient-to-br from-leaf/30 via-aqua/20 to-sunset/20">
            <div className="rounded-[calc(1.5rem-1px)] bg-pitch/80 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-leaf to-turf flex items-center justify-center">
                    <span className="text-midnight font-bold text-xl">{sponsor.initials}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-leaf/70 border border-leaf/[0.2] bg-leaf/[0.08] px-2 py-0.5 rounded-full block mb-1">
                      Premier Partner
                    </span>
                    <p className="text-xl font-bold text-cloud">{sponsor.name}</p>
                  </div>
                </div>
                <p className="text-cloud/60 text-sm leading-relaxed md:flex-1">{sponsor.tagline}</p>
                <Link href={sponsor.ctaHref} className="shrink-0 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3 px-5 text-sm hover:bg-white/[0.13] transition-colors whitespace-nowrap">
                  {sponsor.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        ))}

        {community.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/30 mb-5">Community Sponsors</p>
            <div className="flex flex-wrap gap-3">
              {community.map(sponsor => (
                <Link key={sponsor.id} href={sponsor.ctaHref} className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.08] rounded-2xl py-3 px-4 hover:bg-white/[0.08] active:scale-[0.97] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-pitch flex items-center justify-center shrink-0">
                    <span className="text-cloud/70 font-bold text-xs">{sponsor.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cloud leading-tight">{sponsor.name}</p>
                    <p className="text-xs text-cloud/40 leading-tight">{sponsor.ctaLabel}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
