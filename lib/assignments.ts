/**
 * Assignment data layer — mock for coordinator UI
 *
 * In production: reads from DynamoDB (egs-assignments, egs-audit, egs-notifications, egs-inbound-messages)
 * In mock: returns typed static data that exercises all UI states
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssignmentStatus = 'pending' | 'scored' | 'assigned' | 'exception' | 'overridden'

export interface ScoreBreakdown {
  teamId: string
  teamName: string
  totalScore: number
  proximityScore: number
  coachMatchScore: number
  friendMatchScore: number
  siblingScheduleScore: number
  returningPlayerScore: number
  capacityScore: number
  distanceMiles?: number
  hasCapacity: boolean
}

export interface Assignment {
  profileId: string
  seasonId: string
  playerName: string
  playerBirthYear: number
  playerGender: 'male' | 'female'
  guardianName: string
  guardianEmail: string
  packageName: string
  specialRequest: string
  requestedCoaches: string[]
  requestedFriends: string[]
  siblingNames: string[]
  status: AssignmentStatus
  topTeamId?: string
  topTeamName?: string
  assignedTeamId?: string
  assignedTeamName?: string
  scoreBreakdown: ScoreBreakdown[]
  aiExplanation?: string
  assignedBy: 'system' | 'coordinator'
  coordinatorId?: string
  exceptionReason?: string
  parentEmailSent: boolean
  parentEmailSentAt?: string
  createdAt: string
  updatedAt: string
}

export interface AuditEntry {
  auditId: string
  profileId: string
  playerName: string
  seasonId: string
  eventType: string
  actor: 'system' | 'coordinator'
  coordinatorId?: string
  teamName?: string
  previousTeamName?: string
  notes?: string
  occurredAt: string
}

export interface EmailRecord {
  notificationId: string
  profileId: string
  playerName: string
  recipientEmail: string
  recipientName: string
  subject: string
  templateName: string
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed'
  sentAt?: string
  deliveredAt?: string
  error?: string
  createdAt: string
}

export interface InboundMessage {
  messageId: string
  profileId?: string
  playerName?: string
  fromEmail: string
  fromName: string
  subject: string
  bodyText: string
  receivedAt: string
  status: 'unread' | 'read' | 'actioned' | 'archived'
  coordinatorNotes?: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const destroyersBreakdown: ScoreBreakdown[] = [
  {
    teamId: 'team-2012b-destroyers', teamName: '2012B Destroyers (Bailey)',
    totalScore: 82, proximityScore: 25, coachMatchScore: 25, friendMatchScore: 20,
    siblingScheduleScore: 0, returningPlayerScore: 5, capacityScore: 5,
    distanceMiles: 3.2, hasCapacity: true,
  },
  {
    teamId: 'team-2012b-lightning', teamName: '2012B Lightning (Martinez)',
    totalScore: 42, proximityScore: 20, coachMatchScore: 0, friendMatchScore: 0,
    siblingScheduleScore: 0, returningPlayerScore: 5, capacityScore: 5,
    distanceMiles: 5.8, hasCapacity: true,
  },
]

const stormBreakdown: ScoreBreakdown[] = [
  {
    teamId: 'team-2013g-storm', teamName: '2013G Storm (Chen)',
    totalScore: 65, proximityScore: 25, coachMatchScore: 0, friendMatchScore: 20,
    siblingScheduleScore: 0, returningPlayerScore: 0, capacityScore: 5,
    distanceMiles: 3.4, hasCapacity: true,
  },
  {
    teamId: 'team-2013g-phoenix', teamName: '2013G Phoenix (Okafor)',
    totalScore: 38, proximityScore: 12, coachMatchScore: 0, friendMatchScore: 0,
    siblingScheduleScore: 0, returningPlayerScore: 0, capacityScore: 5,
    distanceMiles: 11.2, hasCapacity: true,
  },
]

export const mockAssignments: Assignment[] = [
  // Assigned — auto-assigned, email sent
  {
    profileId: 'profile-player-001',
    seasonId: 'season-spring-2026',
    playerName: 'Liam Johnson',
    playerBirthYear: 2012,
    playerGender: 'male',
    guardianName: 'Sarah Johnson',
    guardianEmail: 'sarah.johnson@example.com',
    packageName: '2012 Boys Recreational',
    specialRequest: 'Please put with Coach Bailey if possible. Best friends with Noah Williams.',
    requestedCoaches: ['Bailey'],
    requestedFriends: ['Noah Williams'],
    siblingNames: [],
    status: 'assigned',
    topTeamId: 'team-2012b-destroyers',
    topTeamName: '2012B Destroyers (Bailey)',
    assignedTeamId: 'team-2012b-destroyers',
    assignedTeamName: '2012B Destroyers (Bailey)',
    scoreBreakdown: destroyersBreakdown,
    aiExplanation: 'Liam was placed on the Destroyers because the family specifically requested Coach Bailey, who leads this team. His best friend Noah Williams is also assigned to the same team, and the Bartholomew practice field is 3.2 miles from the family home.',
    assignedBy: 'system',
    parentEmailSent: true,
    parentEmailSentAt: '2026-03-15T10:30:00Z',
    createdAt: '2026-02-01T10:23:00Z',
    updatedAt: '2026-03-15T10:30:00Z',
  },
  // Scored — awaiting coordinator review (score below auto-assign threshold)
  {
    profileId: 'profile-player-002',
    seasonId: 'season-spring-2026',
    playerName: 'Emma Garcia',
    playerBirthYear: 2013,
    playerGender: 'female',
    guardianName: 'Miguel Garcia',
    guardianEmail: 'miguel.garcia@example.com',
    packageName: '2013 Girls Recreational',
    specialRequest: 'No preference on coach. Please keep with Sophia Patel — they play together at recess.',
    requestedCoaches: [],
    requestedFriends: ['Sophia Patel'],
    siblingNames: [],
    status: 'scored',
    topTeamId: 'team-2013g-storm',
    topTeamName: '2013G Storm (Chen)',
    scoreBreakdown: stormBreakdown,
    aiExplanation: 'Emma was matched to the Storm primarily for proximity — the Morse Park practice field is 3.4 miles from home. Her friend Sophia Patel has not been assigned yet, so the friend match score will update once Sophia is placed.',
    assignedBy: 'system',
    parentEmailSent: false,
    createdAt: '2026-02-03T14:11:00Z',
    updatedAt: '2026-03-14T09:00:00Z',
  },
  // Assigned — auto-assigned, email sent (friends with Liam)
  {
    profileId: 'profile-player-003',
    seasonId: 'season-spring-2026',
    playerName: 'Noah Williams',
    playerBirthYear: 2012,
    playerGender: 'male',
    guardianName: 'David Williams',
    guardianEmail: 'david.williams@example.com',
    packageName: '2012 Boys Recreational',
    specialRequest: 'Coach Bailey please. Liam Johnson is his best friend.',
    requestedCoaches: ['Bailey'],
    requestedFriends: ['Liam Johnson'],
    siblingNames: [],
    status: 'assigned',
    topTeamId: 'team-2012b-destroyers',
    topTeamName: '2012B Destroyers (Bailey)',
    assignedTeamId: 'team-2012b-destroyers',
    assignedTeamName: '2012B Destroyers (Bailey)',
    scoreBreakdown: destroyersBreakdown,
    aiExplanation: 'Noah was placed on the Destroyers with Coach Bailey as requested. His best friend Liam Johnson is also on this team, and the practice field is close to home.',
    assignedBy: 'system',
    parentEmailSent: true,
    parentEmailSentAt: '2026-03-15T10:35:00Z',
    createdAt: '2026-02-05T09:45:00Z',
    updatedAt: '2026-03-15T10:35:00Z',
  },
  // Exception — no team with capacity
  {
    profileId: 'profile-player-007',
    seasonId: 'season-spring-2026',
    playerName: 'Ethan Park',
    playerBirthYear: 2014,
    playerGender: 'male',
    guardianName: 'Jin Park',
    guardianEmail: 'jin.park@example.com',
    packageName: '2014 Boys Recreational',
    specialRequest: 'Coach Thompson please.',
    requestedCoaches: ['Thompson'],
    requestedFriends: [],
    siblingNames: [],
    status: 'exception',
    topTeamId: 'team-2014b-wolves',
    topTeamName: '2014B Wolves (Thompson)',
    scoreBreakdown: [
      {
        teamId: 'team-2014b-wolves', teamName: '2014B Wolves (Thompson)',
        totalScore: 50, proximityScore: 20, coachMatchScore: 25, friendMatchScore: 0,
        siblingScheduleScore: 0, returningPlayerScore: 5, capacityScore: 0,
        distanceMiles: 4.1, hasCapacity: false,
      },
    ],
    exceptionReason: 'Only eligible team (2014B Wolves) is at full capacity (12/12).',
    assignedBy: 'system',
    parentEmailSent: false,
    createdAt: '2026-02-12T08:00:00Z',
    updatedAt: '2026-03-14T09:00:00Z',
  },
  // Overridden by coordinator
  {
    profileId: 'profile-player-004',
    seasonId: 'season-spring-2026',
    playerName: 'Sophia Patel',
    playerBirthYear: 2013,
    playerGender: 'female',
    guardianName: 'Priya Patel',
    guardianEmail: 'priya.patel@example.com',
    packageName: '2013 Girls Recreational',
    specialRequest: 'Emma Garcia please, they are close friends.',
    requestedCoaches: [],
    requestedFriends: ['Emma Garcia'],
    siblingNames: [],
    status: 'overridden',
    topTeamId: 'team-2013g-phoenix',
    topTeamName: '2013G Phoenix (Okafor)',
    assignedTeamId: 'team-2013g-storm',
    assignedTeamName: '2013G Storm (Chen)',
    scoreBreakdown: [
      {
        teamId: 'team-2013g-phoenix', teamName: '2013G Phoenix (Okafor)',
        totalScore: 45, proximityScore: 12, coachMatchScore: 0, friendMatchScore: 0,
        siblingScheduleScore: 15, returningPlayerScore: 5, capacityScore: 5,
        distanceMiles: 11.2, hasCapacity: true,
      },
      {
        teamId: 'team-2013g-storm', teamName: '2013G Storm (Chen)',
        totalScore: 40, proximityScore: 20, coachMatchScore: 0, friendMatchScore: 0,
        siblingScheduleScore: 0, returningPlayerScore: 5, capacityScore: 5,
        distanceMiles: 6.1, hasCapacity: true,
      },
    ],
    aiExplanation: 'Sophia was overridden from Phoenix to Storm by coordinator to keep her with friend Emma Garcia, who is being placed on the Storm. The extra 5 miles of distance is offset by the friendship match.',
    assignedBy: 'coordinator',
    coordinatorId: 'coordinator-jane',
    parentEmailSent: true,
    parentEmailSentAt: '2026-03-16T14:00:00Z',
    createdAt: '2026-02-08T16:30:00Z',
    updatedAt: '2026-03-16T14:00:00Z',
  },
  // Sibling — pending scoring
  {
    profileId: 'profile-player-005',
    seasonId: 'season-spring-2026',
    playerName: 'Mason Kim',
    playerBirthYear: 2012,
    playerGender: 'male',
    guardianName: 'James Kim',
    guardianEmail: 'james.kim@example.com',
    packageName: '2012 Boys Recreational',
    specialRequest: 'Same practice night as sister Ava if possible.',
    requestedCoaches: [],
    requestedFriends: [],
    siblingNames: ['Ava Kim'],
    status: 'pending',
    scoreBreakdown: [],
    assignedBy: 'system',
    parentEmailSent: false,
    createdAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-02-10T11:00:00Z',
  },
]

export const mockAuditLog: AuditEntry[] = [
  { auditId: 'a-001', profileId: 'profile-player-001', playerName: 'Liam Johnson', seasonId: 'season-spring-2026', eventType: 'registration_received', actor: 'system', occurredAt: '2026-02-01T10:23:00Z' },
  { auditId: 'a-002', profileId: 'profile-player-001', playerName: 'Liam Johnson', seasonId: 'season-spring-2026', eventType: 'scoring_run', actor: 'system', teamName: '2012B Destroyers (Bailey)', notes: 'Score: 82/100', occurredAt: '2026-03-14T09:01:00Z' },
  { auditId: 'a-003', profileId: 'profile-player-001', playerName: 'Liam Johnson', seasonId: 'season-spring-2026', eventType: 'assignment_written', actor: 'system', teamName: '2012B Destroyers (Bailey)', occurredAt: '2026-03-15T10:30:00Z' },
  { auditId: 'a-004', profileId: 'profile-player-001', playerName: 'Liam Johnson', seasonId: 'season-spring-2026', eventType: 'se_write_success', actor: 'system', teamName: '2012B Destroyers (Bailey)', occurredAt: '2026-03-15T10:30:05Z' },
  { auditId: 'a-005', profileId: 'profile-player-001', playerName: 'Liam Johnson', seasonId: 'season-spring-2026', eventType: 'email_sent', actor: 'system', notes: 'Assignment confirmation to sarah.johnson@example.com', occurredAt: '2026-03-15T10:30:10Z' },
  { auditId: 'a-010', profileId: 'profile-player-004', playerName: 'Sophia Patel', seasonId: 'season-spring-2026', eventType: 'scoring_run', actor: 'system', teamName: '2013G Phoenix (Okafor)', notes: 'Score: 45/100', occurredAt: '2026-03-14T09:05:00Z' },
  { auditId: 'a-011', profileId: 'profile-player-004', playerName: 'Sophia Patel', seasonId: 'season-spring-2026', eventType: 'override_applied', actor: 'coordinator', coordinatorId: 'coordinator-jane', teamName: '2013G Storm (Chen)', previousTeamName: '2013G Phoenix (Okafor)', notes: 'Keep with friend Emma Garcia', occurredAt: '2026-03-16T13:55:00Z' },
  { auditId: 'a-012', profileId: 'profile-player-004', playerName: 'Sophia Patel', seasonId: 'season-spring-2026', eventType: 'email_sent', actor: 'system', notes: 'Assignment confirmation to priya.patel@example.com', occurredAt: '2026-03-16T14:00:00Z' },
  { auditId: 'a-020', profileId: 'profile-player-007', playerName: 'Ethan Park', seasonId: 'season-spring-2026', eventType: 'exception_flagged', actor: 'system', notes: 'Only eligible team (2014B Wolves) at full capacity', occurredAt: '2026-03-14T09:08:00Z' },
]

export const mockEmails: EmailRecord[] = [
  { notificationId: 'n-001', profileId: 'profile-player-001', playerName: 'Liam Johnson', recipientEmail: 'sarah.johnson@example.com', recipientName: 'Sarah Johnson', subject: 'Liam has been placed on a team — 2012B Destroyers (Bailey)', templateName: 'assignment_confirmation', status: 'delivered', sentAt: '2026-03-15T10:30:10Z', deliveredAt: '2026-03-15T10:30:15Z', createdAt: '2026-03-15T10:30:10Z' },
  { notificationId: 'n-002', profileId: 'profile-player-003', playerName: 'Noah Williams', recipientEmail: 'david.williams@example.com', recipientName: 'David Williams', subject: 'Noah has been placed on a team — 2012B Destroyers (Bailey)', templateName: 'assignment_confirmation', status: 'delivered', sentAt: '2026-03-15T10:35:00Z', deliveredAt: '2026-03-15T10:35:08Z', createdAt: '2026-03-15T10:35:00Z' },
  { notificationId: 'n-003', profileId: 'profile-player-004', playerName: 'Sophia Patel', recipientEmail: 'priya.patel@example.com', recipientName: 'Priya Patel', subject: 'Sophia has been placed on a team — 2013G Storm (Chen)', templateName: 'assignment_confirmation', status: 'sent', sentAt: '2026-03-16T14:00:00Z', createdAt: '2026-03-16T14:00:00Z' },
]

export const mockInbox: InboundMessage[] = [
  {
    messageId: 'in-001',
    profileId: 'profile-player-001',
    playerName: 'Liam Johnson',
    fromEmail: 'sarah.johnson@example.com',
    fromName: 'Sarah Johnson',
    subject: 'Re: Liam has been placed on a team — 2012B Destroyers (Bailey)',
    bodyText: 'Thank you! We are so happy Liam is with Coach Bailey and Noah. What time is the first practice? Is there a parent meeting?',
    receivedAt: '2026-03-15T14:22:00Z',
    status: 'read',
    coordinatorNotes: 'Replied with practice schedule and parent meeting date.',
  },
  {
    messageId: 'in-002',
    profileId: 'profile-player-004',
    playerName: 'Sophia Patel',
    fromEmail: 'priya.patel@example.com',
    fromName: 'Priya Patel',
    subject: 'Re: Sophia has been placed on a team — 2013G Storm (Chen)',
    bodyText: 'Hi — is Emma Garcia on the same team? Sophia will be very upset if they are separated. Also we live near Heritage Park, is there a team that practices closer?',
    receivedAt: '2026-03-16T18:45:00Z',
    status: 'unread',
  },
]

// ─── Data access functions (swap for DynamoDB in production) ──────────────────

export function getAssignments(seasonId?: string): Assignment[] {
  return seasonId
    ? mockAssignments.filter(a => a.seasonId === seasonId)
    : mockAssignments
}

export function getAssignment(profileId: string): Assignment | undefined {
  return mockAssignments.find(a => a.profileId === profileId)
}

export function getAssignmentsByStatus(status: AssignmentStatus): Assignment[] {
  return mockAssignments.filter(a => a.status === status)
}

export function getAuditLog(profileId?: string): AuditEntry[] {
  return profileId
    ? mockAuditLog.filter(a => a.profileId === profileId)
    : mockAuditLog
}

export function getEmails(): EmailRecord[] {
  return mockEmails
}

export function getInbox(): InboundMessage[] {
  return mockInbox
}

export function getAssignmentStats(): {
  total: number; pending: number; scored: number; assigned: number; exception: number; overridden: number
} {
  const all = mockAssignments
  return {
    total: all.length,
    pending: all.filter(a => a.status === 'pending').length,
    scored: all.filter(a => a.status === 'scored').length,
    assigned: all.filter(a => a.status === 'assigned').length,
    exception: all.filter(a => a.status === 'exception').length,
    overridden: all.filter(a => a.status === 'overridden').length,
  }
}
