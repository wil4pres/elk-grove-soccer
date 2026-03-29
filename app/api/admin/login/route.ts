import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { validatePassword } from '@/lib/auth/password'

function getSecret(): Uint8Array {
  const key = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
  return new TextEncoder().encode(key)
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const result = await validatePassword(password)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getSecret())

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
