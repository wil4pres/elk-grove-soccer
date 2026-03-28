import Link from 'next/link'

const actions = [
  {
    label: 'Field Status',
    description: 'Live updates on all fields',
    href: '/field-status',
    badge: 'LIVE',
    badgeColor: 'bg-leaf/[0.15] text-leaf border-leaf/[0.2]',
    gradient: 'from-leaf/[0.15] to-turf/[0.08]',
    border: 'border-leaf/[0.2]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-leaf">
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
      </svg>
    ),
  },
  {
    label: 'Register Now',
    description: 'Open spots for Spring 2026',
    href: '/register',
    badge: 'OPEN',
    badgeColor: 'bg-sunset/[0.15] text-sunset border-sunset/[0.2]',
    gradient: 'from-sunset/[0.15] to-amber/[0.08]',
    border: 'border-sunset/[0.2]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-sunset">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" x2="19" y1="8" y2="14" />
        <line x1="22" x2="16" y1="11" y2="11" />
      </svg>
    ),
  },
  {
    label: 'Find My Program',
    description: 'Ages 4–16, all levels',
    href: '/programs',
    badge: null,
    badgeColor: '',
    gradient: 'from-aqua/[0.12] to-neon/[0.06]',
    border: 'border-aqua/[0.2]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-aqua">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    label: 'Maps & Schedules',
    description: 'Directions & game times',
    href: '/maps',
    badge: null,
    badgeColor: '',
    gradient: 'from-rose/[0.12] to-rose/[0.05]',
    border: 'border-rose/[0.15]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-rose">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
]

export default function MobileQuickActions() {
  return (
    <section className="px-4 py-8 md:py-10">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`relative bg-gradient-to-br ${action.gradient} border ${action.border} rounded-2xl p-5 min-h-[140px] flex flex-col justify-between active:scale-[0.97] transition-transform hover:border-opacity-50`}
            >
              {/* Badge */}
              {action.badge && (
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${action.badgeColor}`}>
                  {action.badge}
                </span>
              )}

              {/* Icon */}
              <div className="mb-3">
                {action.icon}
              </div>

              {/* Text */}
              <div>
                <p className="font-bold text-cloud text-sm leading-tight mb-0.5">{action.label}</p>
                <p className="text-xs text-cloud/50 leading-snug">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
