import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  logAudit({ action: 'logout', ip })
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
