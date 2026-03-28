import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, refreshSessionTokenIfNeeded } from '@/lib/auth/session'
import { authConfig, sessionCookieOptions, protectedRoutes } from '@/lib/auth/config'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtectedRoute = pathname.startsWith(protectedRoutes.adminPrefix)
  const isPublicRoute = protectedRoutes.publicRoutes.includes(pathname)

  if (isProtectedRoute && !isPublicRoute) {
    const token = req.cookies.get(authConfig.cookieName)?.value

    if (!token) {
      return NextResponse.redirect(new URL(protectedRoutes.redirectUrl, req.url))
    }

    const verifyResult = await verifySessionToken(token)

    if (!verifyResult.valid) {
      const response = NextResponse.redirect(new URL(protectedRoutes.redirectUrl, req.url))
      response.cookies.delete(authConfig.cookieName)
      return response
    }

    const newToken = await refreshSessionTokenIfNeeded(token)

    if (newToken) {
      const response = NextResponse.next()
      response.cookies.set(authConfig.cookieName, newToken, sessionCookieOptions)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
