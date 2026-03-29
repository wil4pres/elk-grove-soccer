import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'admin_session'
const PUBLIC_ROUTES = ['/admin/login', '/admin/logout']

async function verifyToken(token: string): Promise<boolean> {
  // JWT has 3 parts: header.payload.signature
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    // Decode payload to check expiry — no secret needed for this
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.admin) return false
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false

    // Verify HMAC signature using Web Crypto (available in Edge Runtime)
    const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
    const keyData = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const sigBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, sigInput)
    return valid
  } catch {
    return false
  }
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

  const valid = await verifyToken(token)

  if (!valid) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
