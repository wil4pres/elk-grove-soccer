/**
 * Mock SportsEngine Provider
 *
 * Simulates the SE GraphQL API using local typed mock data.
 * The app cannot tell the difference between this and the real SE API.
 * When ready to go live, swap this provider for real SE GraphQL calls.
 *
 * Usage:
 *   import { se } from '../mock/provider.js'
 *   const team = await se.getTeam('team-2012b-destroyers')
 */

import { organizations } from './data/organizations.js'
import { profiles } from './data/profiles.js'
import { registrations } from './data/registrations.js'
import { registrationResults } from './data/registrationResults.js'
import { teams } from './data/teams.js'
import { venues } from './data/venues.js'
import { events } from './data/events.js'

import type {
  SEOrganization,
  SEProfile,
  SERegistration,
  SERegistrationResult,
  SETeam,
  SEVenue,
  SEEvent,
} from '../types/sportsengine.js'

// Simulate network latency in dev (ms)
const MOCK_LATENCY = 50

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function notFound(type: string, id: string): never {
  throw new Error(`[MockSE] ${type} not found: ${id}`)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const se = {

  // ── Organizations ──────────────────────────────────────────────────────────

  async listOrganizations(): Promise<SEOrganization[]> {
    await delay(MOCK_LATENCY)
    return organizations
  },

  async getOrganization(id: string): Promise<SEOrganization> {
    await delay(MOCK_LATENCY)
    return organizations.find(o => o.id === id) ?? notFound('Organization', id)
  },

  // ── Profiles ───────────────────────────────────────────────────────────────

  async listProfiles(organizationId?: string): Promise<SEProfile[]> {
    await delay(MOCK_LATENCY)
    return organizationId
      ? profiles.filter(p => p.organizationId === organizationId)
      : profiles
  },

  async getProfile(id: string): Promise<SEProfile> {
    await delay(MOCK_LATENCY)
    return profiles.find(p => p.id === id) ?? notFound('Profile', id)
  },

  // Detect siblings — same guardian email, different player
  async getSiblings(profileId: string): Promise<SEProfile[]> {
    await delay(MOCK_LATENCY)
    const profile = profiles.find(p => p.id === profileId)
    if (!profile?.guardianEmail) return []
    return profiles.filter(
      p => p.guardianEmail === profile.guardianEmail && p.id !== profileId
    )
  },

  // ── Registrations ──────────────────────────────────────────────────────────

  async listRegistrations(seasonId?: string): Promise<SERegistration[]> {
    await delay(MOCK_LATENCY)
    return seasonId
      ? registrations.filter(r => r.seasonId === seasonId)
      : registrations
  },

  async getRegistration(id: string): Promise<SERegistration> {
    await delay(MOCK_LATENCY)
    return registrations.find(r => r.id === id) ?? notFound('Registration', id)
  },

  async getRegistrationsByProfile(profileId: string): Promise<SERegistration[]> {
    await delay(MOCK_LATENCY)
    return registrations.filter(r => r.profileId === profileId)
  },

  // ── Registration Results ───────────────────────────────────────────────────

  async listRegistrationResults(seasonId?: string): Promise<SERegistrationResult[]> {
    await delay(MOCK_LATENCY)
    return seasonId
      ? registrationResults.filter(r => r.seasonId === seasonId)
      : registrationResults
  },

  async getRegistrationResult(id: string): Promise<SERegistrationResult> {
    await delay(MOCK_LATENCY)
    return registrationResults.find(r => r.id === id) ?? notFound('RegistrationResult', id)
  },

  // Simulate writing an assignment back to SE — in production this is a GraphQL mutation
  async assignPlayerToTeam(
    registrationResultId: string,
    teamId: string,
  ): Promise<{ success: boolean; registrationResultId: string; teamId: string }> {
    await delay(MOCK_LATENCY * 3) // writes are slower
    const rr = registrationResults.find(r => r.id === registrationResultId)
    if (!rr) notFound('RegistrationResult', registrationResultId)
    const team = teams.find(t => t.id === teamId)
    if (!team) notFound('Team', teamId)
    // In mock: mutate in memory (production would call SE GraphQL mutation)
    rr.teamId = teamId
    rr.status = 'accepted'
    rr.updatedAt = new Date().toISOString()
    team.currentRosterSize += 1
    console.log(`[MockSE] ✅ Assigned ${rr.profileId} → ${team.name}`)
    return { success: true, registrationResultId, teamId }
  },

  // ── Teams ──────────────────────────────────────────────────────────────────

  async listTeams(seasonId?: string): Promise<SETeam[]> {
    await delay(MOCK_LATENCY)
    return seasonId
      ? teams.filter(t => t.seasonId === seasonId)
      : teams
  },

  async getTeam(id: string): Promise<SETeam> {
    await delay(MOCK_LATENCY)
    return teams.find(t => t.id === id) ?? notFound('Team', id)
  },

  async getTeamsWithCapacity(seasonId: string): Promise<SETeam[]> {
    await delay(MOCK_LATENCY)
    return teams.filter(
      t => t.seasonId === seasonId && t.currentRosterSize < t.maxRosterSize
    )
  },

  // ── Venues ─────────────────────────────────────────────────────────────────

  async listVenues(organizationId?: string): Promise<SEVenue[]> {
    await delay(MOCK_LATENCY)
    return organizationId
      ? venues.filter(v => v.organizationId === organizationId)
      : venues
  },

  async getVenue(id: string): Promise<SEVenue> {
    await delay(MOCK_LATENCY)
    return venues.find(v => v.id === id) ?? notFound('Venue', id)
  },

  // ── Events ─────────────────────────────────────────────────────────────────

  async listEvents(teamId?: string): Promise<SEEvent[]> {
    await delay(MOCK_LATENCY)
    return teamId
      ? events.filter(e => e.teamId === teamId)
      : events
  },

  async getEvent(id: string): Promise<SEEvent> {
    await delay(MOCK_LATENCY)
    return events.find(e => e.id === id) ?? notFound('Event', id)
  },
}
