/**
 * Email layer — Resend sending + egs-notifications DynamoDB log.
 *
 * ⚠️  TEST MODE: All emails are redirected to TEST_RECIPIENT.
 * The email body shows where it WOULD have gone and what it would have said.
 * Never sends to parents/coaches until test mode is removed.
 */

import { Resend } from 'resend'
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from './dynamo'
import { randomUUID } from 'crypto'
import type { GrandAssignmentRow } from './grand-assignment'

// ─── Test mode — ALL emails go here ───────────────────────────────────────────
const TEST_RECIPIENT = 'wnewsom@elkgrovesoccer.com'
const FROM_ADDRESS = 'EGS Assignments <assignments@sacramento.soccer>'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationRecord {
  notificationId: string
  season: string
  player_id: string
  player_name: string
  intended_recipient_email: string   // where it WOULD go in production
  intended_recipient_name: string
  actual_recipient_email: string     // TEST_RECIPIENT while in test mode
  subject: string
  template: string
  assigned_team_name: string
  status: 'queued' | 'sent' | 'failed'
  resend_id?: string
  error?: string
  sent_at?: string
  created_at: string
}

// ─── Email template ────────────────────────────────────────────────────────────

function buildAssignmentEmail(opts: {
  playerName: string
  teamName: string
  guardianName: string
  guardianEmail: string
  season: string
  signals: string[]
  confidence: 'green' | 'yellow' | 'red'
  isTestMode: true
}): { subject: string; html: string } {
  const subject = `[TEST] ${opts.playerName} has been placed on a team — ${opts.teamName}`

  const confLabel = opts.confidence === 'green' ? '🟢 Strong match' :
                    opts.confidence === 'yellow' ? '🟡 Moderate match' :
                    '🔴 Coordinator-verified placement'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f9fbff;">

      <!-- TEST MODE BANNER -->
      <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 14px 20px; margin-bottom: 0; font-size: 13px; color: #92400e;">
        <strong>⚠️ TEST MODE — This email would have been sent to:</strong><br />
        <strong>${opts.guardianName}</strong> &lt;${opts.guardianEmail}&gt;<br />
        <span style="color: #b45309; font-size: 12px;">In production this banner is removed and the email goes directly to the parent.</span>
      </div>

      <!-- Header -->
      <div style="background: #071428; padding: 32px 40px; text-align: center;">
        <h1 style="color: #f9fbff; font-size: 24px; font-weight: 700; margin: 0 0 4px;">
          Elk Grove Soccer
        </h1>
        <p style="color: #4db3ff; font-size: 14px; margin: 0;">Spring ${opts.season} Season</p>
      </div>

      <!-- Body -->
      <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi ${opts.guardianName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          Great news — <strong>${opts.playerName}</strong> has been placed on a team for the Spring ${opts.season} season!
        </p>

        <!-- Team highlight -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <p style="color: #15803d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">Team Assignment</p>
          <p style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 8px;">${opts.teamName}</p>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">${confLabel}</p>
        </div>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          Your coordinator will be in touch with practice times, field location, and first game details soon.
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
          If you have any questions or need to make changes, please reply to this email.
        </p>

        <p style="color: #374151; font-size: 15px; margin: 0;">
          Go team! ⚽<br />
          <strong>Elk Grove Soccer Coordinator Team</strong>
        </p>

        <!-- TEST: Signal debug info -->
        <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="color: #9ca3af; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">
            [TEST] Assignment signals used:
          </p>
          ${opts.signals.length > 0
            ? opts.signals.map(s => `<p style="color: #6b7280; font-size: 12px; margin: 2px 0;">• ${s}</p>`).join('')
            : '<p style="color: #9ca3af; font-size: 12px; margin: 2px 0;">No signals — assigned by availability</p>'
          }
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 40px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Elk Grove Soccer · sacramento.soccer<br />
          Spring ${opts.season} Season
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

// ─── Send function ─────────────────────────────────────────────────────────────

export async function sendAssignmentEmail(
  assignment: GrandAssignmentRow,
  guardianName: string,
  guardianEmail: string,
  season: string,
): Promise<NotificationRecord> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const notificationId = randomUUID()
  const now = new Date().toISOString()

  const { subject, html } = buildAssignmentEmail({
    playerName: assignment.player_name,
    teamName: assignment.assigned_team_name,
    guardianName,
    guardianEmail,
    season,
    signals: assignment.signals,
    confidence: assignment.confidence,
    isTestMode: true,
  })

  const record: NotificationRecord = {
    notificationId,
    season,
    player_id: assignment.player_id,
    player_name: assignment.player_name,
    intended_recipient_email: guardianEmail,
    intended_recipient_name: guardianName,
    actual_recipient_email: TEST_RECIPIENT,
    subject,
    template: 'assignment_confirmation',
    assigned_team_name: assignment.assigned_team_name,
    status: 'queued',
    created_at: now,
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: TEST_RECIPIENT,   // ← always test recipient
      subject,
      html,
    })

    record.status = 'sent'
    record.resend_id = result.data?.id
    record.sent_at = new Date().toISOString()
  } catch (e) {
    record.status = 'failed'
    record.error = e instanceof Error ? e.message : String(e)
  }

  // Log to DynamoDB regardless of send success
  await db.send(new PutCommand({
    TableName: 'egs-notifications',
    Item: record,
  }))

  return record
}

// ─── Load notification log ─────────────────────────────────────────────────────

export async function loadNotifications(season?: string): Promise<NotificationRecord[]> {
  const items: Record<string, unknown>[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(new ScanCommand({
      TableName: 'egs-notifications',
      ...(season && {
        FilterExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': season },
      }),
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) items.push(item as Record<string, unknown>)
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return items
    .map(i => i as unknown as NotificationRecord)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}
