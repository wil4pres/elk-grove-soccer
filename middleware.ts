export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const COOKIE_NAME = 'admin_session'
const PUBLIC_ROUTES = ['/admin/login', '/admin/logout']
const SESSION_DURATION = '24h'
const REFRESH_BUFFER_SECONDS = 30 * 60 // refresh if <30 min remaining

function getSecret(): Uint8Array {
  const key = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
  return new TextEncoder().encode(key)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/admin') || PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, getSecret())

    // Refresh token if expiring soon
    if (payload.exp && payload.exp - Math.floor(Date.now() / 1000) < REFRESH_BUFFER_SECONDS) {
      const newToken = await new SignJWT({ admin: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(SESSION_DURATION)
        .sign(getSecret())

      const response = NextResponse.next()
      response.cookies.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24,
        sameSite: 'lax',
      })
      return response
    }

    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/admin/login', req.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: '/admin/:path*',
}
