'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/fields', label: 'Fields' },
  { href: '/admin/programs', label: 'Programs' },
  { href: '/admin/sponsors', label: 'Sponsors' },
  { href: '/admin/alumni', label: 'Alumni' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/matching', label: 'Matching' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-[#071428] border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14">
        <Link href="/" className="text-white font-bold text-sm mr-4 shrink-0 hover:opacity-80 transition-opacity">
          EGS Admin
        </Link>
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 scrollbar-hide">
          {navItems.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
        <button
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
            window.location.href = '/admin/login'
          }}
          className="text-white/40 hover:text-white text-xs ml-3 shrink-0 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
