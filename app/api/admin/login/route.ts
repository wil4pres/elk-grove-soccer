import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { validatePassword } from '@/lib/auth/password'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

function getSecret(): Uint8Array {
  const key = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
  return new TextEncoder().encode(key)
}

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req)
    const { allowed, retryAfterSec } = await checkRateLimit(`login:${ip}`, 20, 15 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again in 15 minutes.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const result = await validatePassword(password)

    if (!result.success) {
      logAudit({ action: 'login_failed', ip })
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getSecret())

    logAudit({ action: 'login', ip })
    const csrfToken = crypto.randomUUID()
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    })
    // Not httpOnly so client JS can read and submit it as x-csrf-token header
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false,
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'strict',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
