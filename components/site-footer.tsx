import Link from 'next/link'

const footerLinks = {
  Parents: [
    { label: 'Field Status', href: '/field-status' },
    { label: 'Register', href: '/register' },
    { label: 'Maps & Schedules', href: '/maps' },
    { label: 'Contact', href: '/contact' },
    { label: 'Volunteer', href: '/volunteer' },
  ],
  Programs: [
    { label: 'Future Stars (U5–U7)', href: '/programs#future-stars' },
    { label: 'Recreational (U8–U12)', href: '/programs#recreational' },
    { label: 'Select (U11+)', href: '/programs#select' },
    { label: 'Academy (U13–U16)', href: '/programs#academy' },
    { label: 'Camps & Clinics', href: '/programs#camps' },
  ],
  Club: [
    { label: 'Alumni', href: '/alumni' },
    { label: 'Sponsors', href: '/sponsors' },
    { label: 'Become a Partner', href: '/sponsors#partner' },
    { label: 'Coaching Staff', href: '/staff' },
    { label: 'Club History', href: '/about' },
  ],
}

export default function SiteFooter() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4">
        {/* Main footer grid */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-leaf to-turf flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm leading-none">EG</span>
              </div>
              <span className="font-bold text-cloud text-base leading-tight">
                Elk Grove Soccer
              </span>
            </Link>
            <p className="text-sm text-cloud/50 leading-relaxed mb-5">
              Sacramento&apos;s community soccer club. Building players, families, and community since 2001.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-cloud/30">NorCal Premier League</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-4">
                {section}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-cloud/60 hover:text-cloud transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-cloud/30 text-center sm:text-left">
            &copy; 2026 Elk Grove Soccer. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-leaf"></span>
            <span className="text-xs text-cloud/30 font-medium">NorCal Premier League Member</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
