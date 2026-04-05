/**
 * DynamoDB Table Definitions — EGS Platform Layer
 *
 * These are the NEW tables for the assignment platform.
 * Existing tables (egs-fields, egs-programs, egs-sponsors, egs-alumni, egs-staff)
 * are unchanged and not listed here.
 *
 * Run createTables() to provision all tables in AWS.
 * Safe to run multiple times — skips tables that already exist.
 */

import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  ScalarAttributeType,
  KeyType,
  BillingMode,
  ProjectionType,
} from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
  region: process.env.DYNAMO_REGION ?? 'us-east-1',
  ...(process.env.DYNAMO_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID,
      secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY!,
    },
  }),
})

// ─── Table type definitions ────────────────────────────────────────────────────

/** egs-webhook-events — idempotency log, prevents duplicate processing */
export interface WebhookEventRecord {
  eventId: string         // PK — SE webhook event UUID
  type: string            // registrationResult:create | update | team:update | event:update
  organizationId: string
  receivedAt: string      // ISO 8601
  status: 'received' | 'processing' | 'processed' | 'failed'
  processingDurationMs?: number
  error?: string
  ttl?: number            // epoch seconds — auto-delete old records after 90 days
}

/** egs-se-registrations — raw SE registration events, one per registrationResult */
export interface SERegistrationRecord {
  registrationResultId: string  // PK — SE registrationResult UUID
  seasonId: string              // SK
  organizationId: string
  profileId: string
  packageName: string
  gender: string
  birthYear: number
  rawPayload: string            // JSON string — full SE registrationResult payload
  specialRequest?: string
  schoolAndGrade?: string
  newOrReturning?: string
  volunteerHeadCoach: boolean
  volunteerAsstCoach: boolean
  playerLat?: number            // geocoded from profile address
  playerLon?: number
  geocodedAt?: string
  receivedAt: string
  updatedAt: string
}

/** egs-se-teams — teams synced from SE, with lat/long for proximity scoring */
export interface SETeamRecord {
  teamId: string          // PK — SE team UUID
  seasonId: string        // SK
  organizationId: string
  name: string
  gender: string
  birthYear: number
  headCoachName?: string
  practiceVenueId?: string
  practiceVenueName?: string
  practiceSchedule?: string
  practiceFieldLat?: number   // geocoded from venue address
  practiceFieldLon?: number
  maxRosterSize: number
  currentRosterSize: number   // maintained by egs-capacity, denormalized here
  status: string
  syncedAt: string            // last time this was pulled from SE
  updatedAt: string
}

/** egs-assignments — one record per player per season, full scoring state */
export interface AssignmentRecord {
  profileId: string         // PK
  seasonId: string          // SK
  organizationId: string
  registrationResultId: string
  packageName: string
  gender: string
  birthYear: number

  // Scoring inputs (snapshot at time of scoring)
  playerLat?: number
  playerLon?: number
  specialRequest?: string
  requestedCoaches: string[]    // extracted by AI
  requestedFriends: string[]    // extracted by AI
  requestedTeams: string[]      // extracted by AI
  siblingProfileIds: string[]   // detected via guardian email match
  hasSiblingOnTeam?: boolean

  // Score breakdown
  topTeamId?: string
  scoreBreakdown?: ScoreBreakdown[]
  ruleVersion: string           // version of scoring algorithm used

  // Assignment state
  status: 'pending' | 'scored' | 'assigned' | 'exception' | 'overridden'
  assignedTeamId?: string
  assignedTeamName?: string
  assignedAt?: string
  assignedBy: 'system' | 'coordinator'
  coordinatorId?: string        // if manually assigned/overridden

  // SE write result
  seWriteStatus?: 'pending' | 'success' | 'failed'
  seWriteAttemptedAt?: string
  seWriteError?: string

  // AI explanation
  aiExplanation?: string        // human-readable explanation of why this team
  aiModel?: string

  // Email state
  parentEmailSent: boolean
  parentEmailSentAt?: string

  createdAt: string
  updatedAt: string
}

export interface ScoreBreakdown {
  teamId: string
  teamName: string
  totalScore: number
  proximityScore: number        // 0–30 — road distance to practice field
  coachMatchScore: number       // 0–25 — requested coach match
  friendMatchScore: number      // 0–20 — friend on same team
  siblingScheduleScore: number  // 0–15 — sibling on same night
  returningPlayerScore: number  // 0–5  — returning player bonus
  capacityScore: number         // 0–5  — team has open spots
  distanceMiles?: number
  hasCapacity: boolean
}

/** egs-audit — immutable append-only log of every decision */
export interface AuditRecord {
  auditId: string         // PK — UUID
  profileId: string       // GSI PK — find all events for a player
  seasonId: string        // GSI SK
  eventType:
    | 'registration_received'
    | 'scoring_run'
    | 'assignment_written'
    | 'se_write_success'
    | 'se_write_failed'
    | 'override_applied'
    | 'reassignment'
    | 'email_sent'
    | 'parent_reply_received'
    | 'exception_flagged'
  actor: 'system' | 'coordinator'
  coordinatorId?: string
  teamId?: string
  teamName?: string
  previousTeamId?: string
  scoreBreakdown?: ScoreBreakdown[]
  ruleVersion?: string
  notes?: string
  occurredAt: string
}

/** egs-overrides — coordinator manual overrides with justification */
export interface OverrideRecord {
  overrideId: string      // PK — UUID
  profileId: string       // GSI
  seasonId: string
  coordinatorId: string
  originalTeamId?: string
  originalTeamName?: string
  overrideTeamId: string
  overrideTeamName: string
  justification: string   // required — why was this overridden
  scoreBreakdownAtOverride?: ScoreBreakdown[]
  appliedAt: string
}

/** egs-notifications — outbound email log */
export interface NotificationRecord {
  notificationId: string  // PK — UUID
  profileId: string       // GSI
  seasonId: string
  recipientEmail: string
  recipientName: string
  templateName: 'assignment_confirmation' | 'assignment_update' | 'event_change' | 'general'
  subject: string
  bodyHtml: string
  sesMessageId?: string
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed'
  sentAt?: string
  deliveredAt?: string
  error?: string
  createdAt: string
}

/** egs-inbound-messages — parent email replies / responses */
export interface InboundMessageRecord {
  messageId: string       // PK — UUID or SES inbound message ID
  profileId?: string      // GSI — linked if matched to a player
  seasonId?: string
  notificationId?: string // the email they replied to, if matched
  fromEmail: string
  fromName?: string
  subject: string
  bodyText: string
  receivedAt: string
  status: 'unread' | 'read' | 'actioned' | 'archived'
  coordinatorNotes?: string
  actionedBy?: string
  actionedAt?: string
}

/** egs-oauth-tokens — SportsEngine OAuth tokens per admin user */
export interface OAuthTokenRecord {
  userId: string          // PK — Cognito user ID
  provider: 'sportsengine'
  accessToken: string     // encrypted at rest
  refreshToken: string    // encrypted at rest
  expiresAt: string       // ISO 8601
  scope: string[]
  organizationId: string
  createdAt: string
  updatedAt: string
}

/** egs-capacity — real-time enrollment counters per team per season */
export interface CapacityRecord {
  teamId: string          // PK
  seasonId: string        // SK
  maxRosterSize: number
  currentRosterSize: number  // atomic counter — incremented/decremented with each assignment
  availableSpots: number     // derived: max - current
  lastModifiedAt: string
}

/** egs-coaches — PlayMetrics coach data for season, composite key userId#season */
export interface CoachRecord {
  id: string              // PK — userId#season
  user_id: string         // coach's user ID from PlayMetrics
  season: string          // SK — season year
  first_name: string
  last_name: string
  email: string
  mobile_number: string
  team_id: string
  team_name: string
  role: string            // "Head Coach", "Assistant Coach", etc.
}

// ─── Table creation ────────────────────────────────────────────────────────────

const tableDefinitions = [
  {
    TableName: 'egs-webhook-events',
    KeySchema: [{ AttributeName: 'eventId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [{ AttributeName: 'eventId', AttributeType: ScalarAttributeType.S }],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-se-registrations',
    KeySchema: [
      { AttributeName: 'registrationResultId', KeyType: KeyType.HASH },
      { AttributeName: 'seasonId', KeyType: KeyType.RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: 'registrationResultId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'seasonId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'profileId', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'profileId-seasonId-index',
        KeySchema: [
          { AttributeName: 'profileId', KeyType: KeyType.HASH },
          { AttributeName: 'seasonId', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-se-teams',
    KeySchema: [
      { AttributeName: 'teamId', KeyType: KeyType.HASH },
      { AttributeName: 'seasonId', KeyType: KeyType.RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: 'teamId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'seasonId', AttributeType: ScalarAttributeType.S },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-assignments',
    KeySchema: [
      { AttributeName: 'profileId', KeyType: KeyType.HASH },
      { AttributeName: 'seasonId', KeyType: KeyType.RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: 'profileId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'seasonId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'status', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'status-seasonId-index',
        KeySchema: [
          { AttributeName: 'status', KeyType: KeyType.HASH },
          { AttributeName: 'seasonId', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-audit',
    KeySchema: [
      { AttributeName: 'auditId', KeyType: KeyType.HASH },
    ],
    AttributeDefinitions: [
      { AttributeName: 'auditId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'profileId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'seasonId', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'profileId-seasonId-index',
        KeySchema: [
          { AttributeName: 'profileId', KeyType: KeyType.HASH },
          { AttributeName: 'seasonId', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-overrides',
    KeySchema: [{ AttributeName: 'overrideId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [
      { AttributeName: 'overrideId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'profileId', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'profileId-index',
        KeySchema: [{ AttributeName: 'profileId', KeyType: KeyType.HASH }],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-notifications',
    KeySchema: [{ AttributeName: 'notificationId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [
      { AttributeName: 'notificationId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'profileId', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'profileId-index',
        KeySchema: [{ AttributeName: 'profileId', KeyType: KeyType.HASH }],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-inbound-messages',
    KeySchema: [{ AttributeName: 'messageId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [
      { AttributeName: 'messageId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'profileId', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'profileId-index',
        KeySchema: [{ AttributeName: 'profileId', KeyType: KeyType.HASH }],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-oauth-tokens',
    KeySchema: [{ AttributeName: 'userId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: ScalarAttributeType.S }],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-capacity',
    KeySchema: [
      { AttributeName: 'teamId', KeyType: KeyType.HASH },
      { AttributeName: 'seasonId', KeyType: KeyType.RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: 'teamId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'seasonId', AttributeType: ScalarAttributeType.S },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  {
    TableName: 'egs-coaches',
    KeySchema: [
      { AttributeName: 'id', KeyType: KeyType.HASH },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: ScalarAttributeType.S },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
]

export async function createTables(): Promise<void> {
  console.log(`\nProvisioning ${tableDefinitions.length} DynamoDB tables...\n`)
  for (const def of tableDefinitions) {
    try {
      await client.send(new CreateTableCommand(def))
      console.log(`  ✅ Created: ${def.TableName}`)
    } catch (err) {
      if (err instanceof ResourceInUseException) {
        console.log(`  ⏭  Exists:  ${def.TableName}`)
      } else {
        throw err
      }
    }
  }
  console.log('\nDone.\n')
}

// Run directly: npx tsx platform/dynamo/schema.ts
const isMain = process.argv[1]?.endsWith('schema.ts')
if (isMain) createTables().catch(console.error)
