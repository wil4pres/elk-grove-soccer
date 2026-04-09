import { NextRequest, NextResponse } from 'next/server'
import { runScoring } from '@/lib/matching-engine'

const SEASON = '2026'

export async function GET(_req: NextRequest) {
  try {
    const results = await runScoring(SEASON)
    return NextResponse.json({ season: SEASON, packages: results })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[matching-data]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
