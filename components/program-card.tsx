import Link from 'next/link'
import type { Program } from '@/lib/programs'

const levelConfig = {
  'future-stars': { label: 'Future Stars', color: 'bg-aqua/[0.15] text-aqua border-aqua/[0.2]' },
  'recreational': { label: 'Recreational', color: 'bg-leaf/[0.15] text-leaf border-leaf/[0.2]' },
  'select': { label: 'Select', color: 'bg-sunset/[0.15] text-sunset border-sunset/[0.2]' },
  'academy': { label: 'Academy', color: 'bg-rose/[0.15] text-rose border-rose/[0.2]' },
  'camps': { label: 'Camps & Clinics', color: 'bg-amber/[0.15] text-amber border-amber/[0.2]' },
}

interface ProgramCardProps {
  program: Program
}

export default function ProgramCard({ program }: ProgramCardProps) {
  const level = levelConfig[program.level]
  const capacityPct = Math.round((program.enrolled / program.capacity) * 100)
  const spotsLeft = program.capacity - program.enrolled

  const barColor =
    capacityPct >= 90 ? 'bg-rose' :
    capacityPct >= 70 ? 'bg-sunset' :
    'bg-leaf'

  let ctaContent: React.ReactNode
  if (program.registrationStatus === 'open') {
    ctaContent = (
      <Link
        href={`/register?program=${program.id}`}
        className="block text-center w-full bg-gradient-to-r from-leaf to-sunset text-midnight font-bold rounded-2xl py-3.5 px-5 text-sm hover:opacity-90 active:scale-[0.97] transition-all"
      >
        Register Now
      </Link>
    )
  } else if (program.registrationStatus === 'opens-soon') {
    ctaContent = (
      <div className="text-center w-full bg-sunset/[0.1] border border-sunset/[0.2] text-sunset font-semibold rounded-2xl py-3.5 px-5 text-sm">
        Opens {program.opensDate}
      </div>
    )
  } else if (program.registrationStatus === 'waitlist') {
    ctaContent = (
      <Link
        href={`/register?program=${program.id}&waitlist=1`}
        className="block text-center w-full bg-white/[0.06] border border-white/[0.1] text-cloud/60 font-semibold rounded-2xl py-3.5 px-5 text-sm hover:bg-white/[0.1] transition-colors"
      >
        Join Waitlist
      </Link>
    )
  } else {
    ctaContent = (
      <div className="text-center w-full bg-white/[0.04] border border-white/[0.06] text-cloud/30 font-semibold rounded-2xl py-3.5 px-5 text-sm cursor-not-allowed">
        Closed
      </div>
    )
  }

  return (
    <div className="bg-white/[0.05] border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4 active:scale-[0.97] transition-transform">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${level.color} mb-2`}>
            {level.label}
          </span>
          <h3 className="text-xl font-bold text-cloud leading-tight">{program.name}</h3>
          <p className="text-sm text-cloud/50 mt-0.5">{program.ageBand}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-cloud">${program.price}</p>
          <p className="text-xs text-cloud/40">per season</p>
        </div>
      </div>

      <p className="text-sm text-cloud/65 leading-relaxed">{program.description}</p>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-cloud/40 font-medium">
            {spotsLeft > 0 ? `${spotsLeft} spots remaining` : 'No spots left'}
          </span>
          <span className="text-xs text-cloud/40">{program.enrolled}/{program.capacity}</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${capacityPct}%` }} />
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {program.highlights.slice(0, 3).map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-cloud/60">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-leaf shrink-0"></span>
            {h}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06] text-xs text-cloud/40">
        <span>{program.commitment}</span>
        <span className="font-medium text-cloud/50">{program.season}</span>
      </div>

      {ctaContent}
    </div>
  )
}
