/**
 * Coordinator Approval Workflow
 *
 * Handles the full lifecycle of an assignment:
 *   1. Auto-assign (if clean score, no exceptions)
 *   2. Flag exception (coordinator review required)
 *   3. Coordinator approve
 *   4. Coordinator override with justification
 *   5. Write to SE (mock)
 *   6. Send parent email (mock)
 *   7. Record audit trail
 */

import { randomUUID } from 'crypto'
import { se } from '../mock/provider.js'
import { scorePlayer, generateExplanation, RULE_VERSION } from '../engine/scoring.js'
import type {
  AssignmentRecord,
  AuditRecord,
  OverrideRecord,
  NotificationRecord,
} from '../dynamo/schema.js'

// ─── In-memory stores (replace with DynamoDB in production) ───────────────────

export const assignments = new Map<string, AssignmentRecord>()   // key: profileId#seasonId
export const auditLog: AuditRecord[] = []
export const overrides: OverrideRecord[] = []
export const notifications: NotificationRecord[] = []

function assignmentKey(profileId: string, seasonId: string) {
  return `${profileId}#${seasonId}`
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

function writeAudit(entry: Omit<AuditRecord, 'auditId'>): void {
  auditLog.push({ auditId: randomUUID(), ...entry })
}

// ─── Email simulation ─────────────────────────────────────────────────────────

async function sendAssignmentEmail(
  assignment: AssignmentRecord,
): Promise<void> {
  const profile = await se.getProfile(assignment.profileId)
  const team = assignment.assignedTeamId
    ? await se.getTeam(assignment.assignedTeamId)
    : null
  const venue = team?.practiceVenueId
    ? await se.getVenue(team.practiceVenueId)
    : null

  const notification: NotificationRecord = {
    notificationId: randomUUID(),
    profileId: assignment.profileId,
    seasonId: assignment.seasonId,
    recipientEmail: profile.guardianEmail ?? profile.email,
    recipientName: `${profile.guardianFirstName ?? ''} ${profile.guardianLastName ?? ''}`.trim() || profile.firstName,
    templateName: 'assignment_confirmation',
    subject: `${profile.firstName} has been placed on a team — ${team?.name ?? 'TBD'}`,
    bodyHtml: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #080d1a;">Great news — ${profile.firstName} has a team!</h2>
  <p>Hi ${profile.guardianFirstName ?? profile.firstName},</p>
  <p>${profile.firstName} has been placed on <strong>${team?.name ?? 'TBD'}</strong> for the Spring 2026 season.</p>
  ${team ? `
  <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Coach</strong></td>
      <td style="padding: 8px 0;">${team.headCoachName ?? 'TBD'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #666;"><strong>Practice field</strong></td>
      <td style="padding: 8px 0;">${venue?.name ?? team.practiceVenueName ?? 'TBD'}</td>
    </tr>
    ${venue?.address ? `
    <tr>
      <td style="padding: 8px 0; color: #666;"><strong>Address</strong></td>
      <td style="padding: 8px 0;">${venue.address.street1}, ${venue.address.city}, ${venue.address.state} ${venue.address.zip}</td>
    </tr>` : ''}
    <tr>
      <td style="padding: 8px 0; color: #666;"><strong>Practice schedule</strong></td>
      <td style="padding: 8px 0;">${team.practiceSchedule ?? 'TBD — coach will follow up'}</td>
    </tr>
  </table>
  ` : ''}
  ${assignment.aiExplanation ? `<p style="color: #444; font-style: italic;">${assignment.aiExplanation}</p>` : ''}
  <p>Questions? Reply to this email or visit <a href="https://sacramento.soccer/contact">sacramento.soccer/contact</a>.</p>
  <p>Go ${team?.name?.split(' ').pop() ?? 'team'}!</p>
  <hr style="border:none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #999; font-size: 12px;">Elk Grove Soccer — sacramento.soccer</p>
</div>`,
    sesMessageId: `mock-ses-${randomUUID()}`, // in production: real SES message ID
    status: 'sent',
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }

  notifications.push(notification)
  console.log(`  📧 Email queued → ${notification.recipientEmail} (${notification.subject})`)
}

// ─── Core workflow functions ───────────────────────────────────────────────────

/**
 * Step 1: Process a new registration result webhook.
 * Runs the scoring engine and either auto-assigns or flags as exception.
 */
export async function processRegistration(
  profileId: string,
  seasonId: string,
  registrationResultId: string,
): Promise<AssignmentRecord> {
  console.log(`\n[Workflow] Processing registration for ${profileId}...`)

  const result = await scorePlayer(profileId, seasonId, registrationResultId)

  writeAudit({
    profileId,
    seasonId,
    eventType: 'scoring_run',
    actor: 'system',
    scoreBreakdown: result.ranked,
    ruleVersion: RULE_VERSION,
    notes: result.isException ? result.exceptionReason : `Top team: ${result.topTeam?.teamName}`,
    occurredAt: new Date().toISOString(),
  })

  const now = new Date().toISOString()
  const record: AssignmentRecord = {
    profileId,
    seasonId,
    organizationId: 'org-egs-001',
    registrationResultId,
    packageName: result.ranked[0]?.teamName ?? '',
    gender: '',
    birthYear: 0,
    playerLat: undefined,
    playerLon: undefined,
    specialRequest: undefined,
    requestedCoaches: result.extracted.coaches,
    requestedFriends: result.extracted.friends,
    requestedTeams: result.extracted.teams,
    siblingProfileIds: [],
    topTeamId: result.topTeam?.teamId,
    scoreBreakdown: result.ranked,
    ruleVersion: RULE_VERSION,
    status: result.isException ? 'exception' : 'scored',
    assignedBy: 'system',
    parentEmailSent: false,
    createdAt: now,
    updatedAt: now,
  }

  assignments.set(assignmentKey(profileId, seasonId), record)

  if (result.isException) {
    console.log(`  ⚠️  Exception: ${result.exceptionReason}`)
    console.log(`  → Flagged for coordinator review`)
    writeAudit({
      profileId, seasonId,
      eventType: 'exception_flagged',
      actor: 'system',
      notes: result.exceptionReason,
      occurredAt: now,
    })
  } else {
    console.log(`  ✅ Scored — top team: ${result.topTeam?.teamName} (${result.topTeam?.totalScore}/100)`)
    // Auto-assign if score is confident (> 50)
    if (result.topTeam && result.topTeam.totalScore > 50) {
      await autoAssign(profileId, seasonId)
    } else {
      console.log(`  → Score below auto-assign threshold — queued for coordinator review`)
    }
  }

  return record
}

/**
 * Step 2: Auto-assign to top-scoring team.
 * Writes to SE mock and sends parent email.
 */
export async function autoAssign(
  profileId: string,
  seasonId: string,
): Promise<void> {
  const key = assignmentKey(profileId, seasonId)
  const record = assignments.get(key)
  if (!record?.topTeamId) throw new Error(`No scored assignment for ${profileId}`)

  const team = await se.getTeam(record.topTeamId)
  const profile = await se.getProfile(profileId)
  const topBreakdown = record.scoreBreakdown?.find(b => b.teamId === record.topTeamId)

  // Generate AI explanation
  if (topBreakdown) {
    record.aiExplanation = await generateExplanation(
      profile, team, topBreakdown,
      { coaches: record.requestedCoaches, friends: record.requestedFriends, teams: record.requestedTeams, notes: '' }
    )
  }

  // Write to SE (mock)
  console.log(`  → Writing assignment to SportsEngine (mock)...`)
  const seResult = await se.assignPlayerToTeam(record.registrationResultId, record.topTeamId)

  const now = new Date().toISOString()
  record.status = seResult.success ? 'assigned' : 'exception'
  record.assignedTeamId = seResult.success ? record.topTeamId : undefined
  record.assignedTeamName = seResult.success ? team.name : undefined
  record.assignedAt = seResult.success ? now : undefined
  record.seWriteStatus = seResult.success ? 'success' : 'failed'
  record.seWriteAttemptedAt = now
  record.updatedAt = now

  assignments.set(key, record)

  writeAudit({
    profileId, seasonId,
    eventType: seResult.success ? 'se_write_success' : 'se_write_failed',
    actor: 'system',
    teamId: record.topTeamId,
    teamName: team.name,
    scoreBreakdown: record.scoreBreakdown,
    ruleVersion: RULE_VERSION,
    occurredAt: now,
  })

  if (seResult.success) {
    await sendAssignmentEmail(record)
    record.parentEmailSent = true
    record.parentEmailSentAt = new Date().toISOString()
    console.log(`  ✅ Auto-assigned: ${profileId} → ${team.name}`)
  }
}

/**
 * Step 3: Coordinator approves the system suggestion.
 */
export async function coordinatorApprove(
  profileId: string,
  seasonId: string,
  coordinatorId: string,
): Promise<void> {
  const key = assignmentKey(profileId, seasonId)
  const record = assignments.get(key)
  if (!record) throw new Error(`No assignment record for ${profileId}`)

  record.assignedBy = 'coordinator'
  record.coordinatorId = coordinatorId
  await autoAssign(profileId, seasonId)

  writeAudit({
    profileId, seasonId,
    eventType: 'assignment_written',
    actor: 'coordinator',
    coordinatorId,
    teamId: record.topTeamId,
    notes: 'Coordinator approved system suggestion',
    occurredAt: new Date().toISOString(),
  })
}

/**
 * Step 4: Coordinator overrides to a different team with justification.
 */
export async function coordinatorOverride(
  profileId: string,
  seasonId: string,
  newTeamId: string,
  coordinatorId: string,
  justification: string,
): Promise<void> {
  const key = assignmentKey(profileId, seasonId)
  const record = assignments.get(key)
  if (!record) throw new Error(`No assignment record for ${profileId}`)

  const [newTeam] = await Promise.all([se.getTeam(newTeamId)])

  const override: OverrideRecord = {
    overrideId: randomUUID(),
    profileId,
    seasonId,
    coordinatorId,
    originalTeamId: record.topTeamId,
    originalTeamName: record.scoreBreakdown?.find(b => b.teamId === record.topTeamId)?.teamName,
    overrideTeamId: newTeamId,
    overrideTeamName: newTeam.name,
    justification,
    scoreBreakdownAtOverride: record.scoreBreakdown,
    appliedAt: new Date().toISOString(),
  }
  overrides.push(override)

  // Redirect assignment to override team
  record.topTeamId = newTeamId
  record.assignedBy = 'coordinator'
  record.coordinatorId = coordinatorId
  record.status = 'overridden'

  writeAudit({
    profileId, seasonId,
    eventType: 'override_applied',
    actor: 'coordinator',
    coordinatorId,
    teamId: newTeamId,
    teamName: newTeam.name,
    previousTeamId: override.originalTeamId,
    notes: justification,
    occurredAt: new Date().toISOString(),
  })

  console.log(`  🔄 Override: ${profileId} → ${newTeam.name} (by ${coordinatorId})`)
  console.log(`     Justification: ${justification}`)

  await autoAssign(profileId, seasonId)
}

// ─── CLI demo ─────────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('approval.ts')
if (isMain) {
  (async () => {
    console.log('\n[Workflow Demo] Running full pipeline for 2 players...\n')

    // Player 1 — should auto-assign cleanly
    await processRegistration('profile-player-001', 'season-spring-2026', 'rr-001')

    // Player 2 — demonstrate coordinator override
    await processRegistration('profile-player-002', 'season-spring-2026', 'rr-002')
    await coordinatorOverride(
      'profile-player-002', 'season-spring-2026',
      'team-2013g-phoenix',
      'coordinator-jane',
      'Storm is at capacity after manual review — Phoenix has open spots and same school district.'
    )

    console.log('\n[Audit Log]')
    console.log('─'.repeat(60))
    auditLog.forEach(e => console.log(`  ${e.occurredAt} | ${e.eventType} | ${e.actor} | ${e.teamName ?? ''}`))

    console.log('\n[Notifications Sent]')
    console.log('─'.repeat(60))
    notifications.forEach(n => console.log(`  → ${n.recipientEmail} | ${n.subject}`))
  })().catch(console.error)
}
