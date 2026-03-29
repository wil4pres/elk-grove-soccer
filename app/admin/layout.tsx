'use client'
import { usePathname } from 'next/navigation'
import { AdminNav } from './_components/admin-nav'

const NO_NAV_ROUTES = ['/admin/login', '/admin/logout']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNav = !NO_NAV_ROUTES.includes(pathname)

  if (!showNav) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
