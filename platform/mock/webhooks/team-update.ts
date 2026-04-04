/**
 * Simulate: team:update
 *
 * Fired when a team record changes in SE — coach reassigned,
 * practice venue changed, roster size updated. May trigger re-scoring
 * for already-assigned players. Run with:
 *   npm run webhook:team-update
 */

import { randomUUID } from 'crypto'
import type { SETeamWebhook } from '../../types/sportsengine.js'
import { teams } from '../data/teams.js'

const team = teams[0] // 2012B Destroyers

const updatedTeam = {
  ...team,
  practiceVenueId: 'venue-morse',
  practiceVenueName: 'Morse Park',         // practice field changed
  practiceSchedule: 'Tuesdays 5:30–7:00pm',
  updatedAt: new Date().toISOString(),
}

const webhookPayload: SETeamWebhook = {
  id: randomUUID(),
  type: 'team:update',
  organizationId: team.organizationId,
  occurredAt: updatedTeam.updatedAt,
  deliveredAt: new Date().toISOString(),
  data: updatedTeam,
}

console.log('\n[Webhook Simulation] team:update')
console.log('─'.repeat(60))
console.log(JSON.stringify(webhookPayload, null, 2))
console.log('─'.repeat(60))
console.log(`\n→ Team:     ${team.name}`)
console.log(`→ Change:   practice venue changed to Morse Park`)
console.log('\n[Next step] Lambda re-geocodes field, re-scores proximity for all assigned players.')
console.log('[Next step] If any player score drops significantly, flag for coordinator review.\n')
