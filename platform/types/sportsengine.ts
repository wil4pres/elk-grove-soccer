/**
 * SportsEngine GraphQL API — TypeScript interfaces
 *
 * Modeled from the SE platform object schema:
 * https://dev.sportsengine.com
 *
 * These are the core/interconnecting platform objects SE exposes via GraphQL.
 * AWS is NOT the source of truth for these — SE is. These interfaces describe
 * the shape of data we read from SE (or simulate in mock).
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

export type SEGender = 'male' | 'female' | 'coed' | 'unknown'
export type SEStatus = 'active' | 'inactive' | 'pending' | 'archived'
export type SEAssignmentStatus = 'pending' | 'accepted' | 'declined' | 'waitlisted'
export type SEEventType = 'game' | 'practice' | 'tournament' | 'other'
export type SERegistrationStatus = 'open' | 'closed' | 'waitlist' | 'pending'

export interface SEAddress {
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country: string
  lat?: number
  lon?: number
}

export interface SEContactInfo {
  email?: string
  phone?: string
  alternatePhone?: string
}

// ─── Organization ─────────────────────────────────────────────────────────────

export interface SEOrganization {
  id: string                    // SE org UUID
  name: string                  // "Elk Grove Soccer"
  abbreviation?: string         // "EGS"
  sport: string                 // "soccer"
  timezone: string              // "America/Los_Angeles"
  status: SEStatus
  address?: SEAddress
  contact?: SEContactInfo
  logoUrl?: string
  websiteUrl?: string
  parentOrganizationId?: string // for sub-orgs / leagues
  createdAt: string             // ISO 8601
  updatedAt: string
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface SEProfile {
  id: string                    // SE profile UUID
  organizationId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  birthDate?: string            // YYYY-MM-DD
  gender?: SEGender
  address?: SEAddress
  guardianFirstName?: string    // parent/guardian
  guardianLastName?: string
  guardianEmail?: string
  guardianPhone?: string
  status: SEStatus
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

// ─── Registration ─────────────────────────────────────────────────────────────

export interface SERegistrationAnswer {
  questionId: string
  questionText: string
  answer: string
}

export interface SERegistration {
  id: string                    // SE registration UUID
  organizationId: string
  profileId: string             // the player
  seasonId: string
  packageName: string           // e.g. "2012 Boys Recreational"
  status: SERegistrationStatus
  answers: SERegistrationAnswer[] // free-form Q&A from the form
  specialRequest?: string       // parsed from answers — coach/friend/team requests
  schoolAndGrade?: string
  newOrReturning?: 'new' | 'returning'
  volunteerHeadCoach: boolean
  volunteerAsstCoach: boolean
  totalAmountPaid?: number
  createdAt: string
  updatedAt: string
}

// ─── Registration Result ──────────────────────────────────────────────────────

/**
 * A registrationResult is SE's object for the outcome of a registration —
 * it is created when a registration is submitted and updated as it progresses.
 * This is the primary trigger object for our webhook pipeline.
 */
export interface SERegistrationResult {
  id: string                    // SE registrationResult UUID
  registrationId: string
  organizationId: string
  profileId: string
  seasonId: string
  status: SEAssignmentStatus
  teamId?: string               // set when officially assigned in SE
  rosterId?: string
  packageName: string
  amountPaid?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface SETeam {
  id: string                    // SE team UUID
  organizationId: string
  seasonId: string
  name: string                  // e.g. "2012B Destroyers (Bailey)"
  sport: string
  gender: SEGender
  birthYear: number             // e.g. 2012
  division?: string
  headCoachProfileId?: string
  headCoachName?: string        // denormalized for convenience
  assistantCoachProfileIds?: string[]
  rosterId?: string
  practiceVenueId?: string      // links to SEVenue
  practiceVenueName?: string    // denormalized
  practiceSchedule?: string     // free text e.g. "Tuesdays 6–7:30pm"
  maxRosterSize: number
  currentRosterSize: number
  status: SEStatus
  createdAt: string
  updatedAt: string
}

// ─── Roster ───────────────────────────────────────────────────────────────────

export interface SERosterMember {
  profileId: string
  role: 'player' | 'head_coach' | 'assistant_coach' | 'manager'
  status: SEAssignmentStatus
  addedAt: string
}

export interface SERoster {
  id: string                    // SE roster UUID
  teamId: string
  organizationId: string
  seasonId: string
  members: SERosterMember[]
  createdAt: string
  updatedAt: string
}

// ─── Venue / Sub-venue ────────────────────────────────────────────────────────

export interface SESubvenue {
  id: string
  venueId: string
  name: string                  // e.g. "Field 3", "Pitch B"
  capacity?: number
  surface?: string              // "grass" | "turf" | "indoor"
}

export interface SEVenue {
  id: string                    // SE venue UUID
  organizationId: string
  name: string                  // e.g. "Bartholomew Sports Complex"
  address: SEAddress            // always has lat/lon for proximity scoring
  phone?: string
  website?: string
  subvenues?: SESubvenue[]
  status: SEStatus
  createdAt: string
  updatedAt: string
}

// ─── Event ────────────────────────────────────────────────────────────────────

export interface SEEvent {
  id: string                    // SE event UUID
  organizationId: string
  seasonId: string
  teamId: string
  opponentTeamId?: string
  venueId: string
  subvenueId?: string
  type: SEEventType
  title?: string
  startTime: string             // ISO 8601
  endTime: string               // ISO 8601
  status: 'scheduled' | 'cancelled' | 'postponed' | 'completed'
  homeOrAway?: 'home' | 'away' | 'neutral'
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Webhook event envelope ───────────────────────────────────────────────────

/**
 * SE delivers webhooks as POST requests with this envelope.
 * The `type` field determines which payload shape is in `data`.
 */
export type SEWebhookType =
  | 'registrationResult:create'
  | 'registrationResult:update'
  | 'team:update'
  | 'event:update'

export interface SEWebhookEvent<T = unknown> {
  id: string                    // unique event ID — used for idempotency
  type: SEWebhookType
  organizationId: string
  occurredAt: string            // ISO 8601 — when the change happened in SE
  deliveredAt: string           // ISO 8601 — when SE sent the webhook
  data: T                       // typed payload — see below
}

// Typed webhook payloads
export type SERegistrationResultWebhook = SEWebhookEvent<SERegistrationResult>
export type SETeamWebhook = SEWebhookEvent<SETeam>
export type SEEventWebhook = SEWebhookEvent<SEEvent>

// ─── Pending webhook (mock queue) ─────────────────────────────────────────────

/**
 * Used in local mock only — simulates events waiting in SQS.
 * In production this is replaced by real SQS messages.
 */
export interface SEPendingWebhookEvent {
  id: string
  type: SEWebhookType
  payload: SEWebhookEvent
  queuedAt: string
  attempts: number
  lastAttemptAt?: string
  status: 'pending' | 'processing' | 'processed' | 'failed'
}
