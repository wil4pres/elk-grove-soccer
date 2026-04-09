import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export function ok(data: unknown) {
  return NextResponse.json(data)
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 })
}

export function notFound(msg = 'Not found') {
  return NextResponse.json({ error: msg }, { status: 404 })
}

export function badRequest(msg = 'Bad request') {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function serverError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  console.error('[serverError]', msg, e)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function requireAdminSession(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/)
  const token = match?.[1]
  if (!token) return false
  try {
    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
    )
    const { payload } = await jwtVerify(token, secret)
    return payload.admin === true
  } catch {
    return false
  }
}

export function requireAdminKey(req: Request): boolean {
  const key = req.headers.get('x-api-key')
  const expected = process.env.ADMIN_API_KEY
  if (!key || !expected) return false
  const a = Buffer.from(key)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return require('crypto').timingSafeEqual(a, b)
}
