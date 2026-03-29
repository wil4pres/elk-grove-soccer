import { NextRequest, NextResponse } from 'next/server'
import { validatePassword } from '@/lib/auth/password'
import { createSessionToken } from '@/lib/auth/session'
import { authConfig, sessionCookieOptions } from '@/lib/auth/config'

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

    const token = await createSessionToken()
    const response = NextResponse.json({ success: true })
    response.cookies.set(authConfig.cookieName, token, sessionCookieOptions)
    return response
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
