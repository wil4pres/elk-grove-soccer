import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isLoginPage = pathname === '/admin/login'
  const isLogoutPage = pathname === '/admin/logout'

  if (pathname.startsWith('/admin') && !isLoginPage && !isLogoutPage) {
    const token = req.cookies.get('admin_session')?.value
    if (!token || !(await verifySessionToken(token))) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
