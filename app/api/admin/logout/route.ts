import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  })
  return res
}
