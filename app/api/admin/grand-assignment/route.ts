import { NextRequest, NextResponse } from 'next/server'
import { isSessionValid } from '@/lib/auth/session'
import {
  runGrandAssignment,
  loadReport,
  overrideAssignment,
  approveOverflow,
  clearAssignments,
} from '@/lib/grand-assignment'
import { logAudit } from '@/lib/audit'

const SEASON = '2026'

/** GET — load the current grand assignment report */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await loadReport(SEASON)
    if (!report) {
      return NextResponse.json({ report: null, message: 'No grand assignment has been run yet' })
    }
    return NextResponse.json({ report })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[grand-assignment GET]', msg)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST — run the grand assignment (or perform coordinator actions) */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action ?? 'run'

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

    switch (action) {
      case 'run': {
        await clearAssignments(SEASON)
        const report = await runGrandAssignment(SEASON)
        logAudit({ action: 'run_grand_assignment', ip, detail: { season: SEASON } })
        return NextResponse.json({ report })
      }

      case 'override': {
        const { playerId, teamId, teamName } = body
        if (!playerId || !teamId || !teamName) {
          return NextResponse.json({ error: 'Missing playerId, teamId, or teamName' }, { status: 400 })
        }
        const row = await overrideAssignment(playerId, SEASON, teamId, teamName)
        logAudit({ action: 'override_assignment', ip, detail: { playerId, teamId, teamName } })
        return NextResponse.json({ assignment: row })
      }

      case 'approve_overflow': {
        const { playerId } = body
        if (!playerId) {
          return NextResponse.json({ error: 'Missing playerId' }, { status: 400 })
        }
        await approveOverflow(playerId, SEASON)
        logAudit({ action: 'approve_overflow', ip, detail: { playerId } })
        return NextResponse.json({ ok: true })
      }

      case 'rerun': {
        const report = await runGrandAssignment(SEASON)
        logAudit({ action: 'run_grand_assignment', ip, detail: { season: SEASON, rerun: true } })
        return NextResponse.json({ report })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[grand-assignment POST]', msg)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
