import { NextRequest, NextResponse } from 'next/server'
import { isSessionValid } from '@/lib/auth/session'
import { loadReport } from '@/lib/grand-assignment'
import { sendAssignmentEmail, loadNotifications } from '@/lib/email'
import { loadMatchingData } from '@/lib/matching-engine'

const SEASON = '2026'

/** GET — load the notification log */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const notifications = await loadNotifications(SEASON)
    return NextResponse.json({ notifications })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** POST — send confirmation emails for all assigned players */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    // Optional: send only for specific player_ids
    const playerIds: string[] | undefined = body.playerIds

    const report = await loadReport(SEASON)
    if (!report) {
      return NextResponse.json({ error: 'No grand assignment report found. Run grand assignment first.' }, { status: 400 })
    }

    // Load player data to get guardian names/emails
    const { playersByPackage } = await loadMatchingData(SEASON)
    const playerMap = new Map<string, { guardianName: string; guardianEmail: string }>()
    for (const players of playersByPackage.values()) {
      for (const p of players) {
        // Guardian name: use account_email domain or first_name's parent field
        // egs-players stores account_email — use player's name as fallback guardian label
        playerMap.set(p.player_id, {
          guardianName: `${p.first_name} ${p.last_name} Family`,
          guardianEmail: p.account_email || 'unknown@example.com',
        })
      }
    }

    // Filter assignments
    let toSend = report.assignments
    if (playerIds && playerIds.length > 0) {
      toSend = toSend.filter(a => playerIds.includes(a.player_id))
    }

    if (toSend.length === 0) {
      return NextResponse.json({ error: 'No assignments to send emails for.' }, { status: 400 })
    }

    // Send in batches of 5 to avoid rate limiting
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    for (let i = 0; i < toSend.length; i += 5) {
      const batch = toSend.slice(i, i + 5)
      await Promise.all(batch.map(async (assignment) => {
        const guardian = playerMap.get(assignment.player_id) ?? {
          guardianName: `${assignment.player_name} Family`,
          guardianEmail: 'unknown@example.com',
        }

        const record = await sendAssignmentEmail(
          assignment,
          guardian.guardianName,
          guardian.guardianEmail,
          SEASON,
        )

        if (record.status === 'sent') {
          results.sent++
        } else {
          results.failed++
          if (record.error) results.errors.push(`${assignment.player_name}: ${record.error}`)
        }
      }))

      // Brief pause between batches
      if (i + 5 < toSend.length) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    return NextResponse.json({
      ok: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      message: `Sent ${results.sent} emails to wnewsom@elkgrovesoccer.com (test mode). ${results.failed > 0 ? `${results.failed} failed.` : ''}`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[send-assignment-emails]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
