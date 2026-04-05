import { NextRequest, NextResponse } from 'next/server'
import { isSessionValid } from '@/lib/auth/session'
import { runScoring } from '@/lib/matching-engine'

const SEASON = '2026'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await runScoring(SEASON)
    return NextResponse.json({ season: SEASON, packages: results })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[matching-data]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
