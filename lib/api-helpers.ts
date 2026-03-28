import { NextResponse } from 'next/server'

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
  console.error(e)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function requireAdminKey(req: Request): boolean {
  const key = req.headers.get('x-api-key')
  return key === process.env.ADMIN_API_KEY && !!process.env.ADMIN_API_KEY
}
