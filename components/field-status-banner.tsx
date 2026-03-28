import Link from 'next/link'
import { getFieldStatusSummary } from '@/lib/fieldStatus'

export default function FieldStatusBanner() {
  const summary = getFieldStatusSummary()

  const colorMap = {
    open: {
      dot: 'bg-leaf',
      pill: 'bg-leaf/[0.15] text-leaf border-leaf/[0.25]',
      label: 'OPEN',
    },
    delay: {
      dot: 'bg-sunset',
      pill: 'bg-sunset/[0.15] text-sunset border-sunset/[0.25]',
      label: 'DELAYED',
    },
    closed: {
      dot: 'bg-rose',
      pill: 'bg-rose/[0.15] text-rose border-rose/[0.25]',
      label: 'CLOSED',
    },
  }

  const colors = colorMap[summary.status]

  return (
    <div className="bg-slate-50 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Status pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide ${colors.pill}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} animate-pulse`} />
          {colors.label}
        </span>

        {/* Message */}
        <span className="text-sm text-cloud/70 flex-1 min-w-0">
          {summary.message}
          <span className="text-cloud/40 ml-1.5 text-xs">· Updated {summary.updatedAt}</span>
        </span>

        {/* Details link */}
        <Link
          href="/field-status"
          className="text-sm font-semibold text-leaf hover:text-neon transition-colors shrink-0 whitespace-nowrap"
        >
          Details &rarr;
        </Link>
      </div>
    </div>
  )
}
