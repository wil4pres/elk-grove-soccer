/**
 * Simulate: event:update
 *
 * Fired when a game or practice event changes — venue moved,
 * time changed, cancelled. Coordinators may need to notify affected
 * families. Run with:
 *   npm run webhook:event-update
 */

import { randomUUID } from 'crypto'
import type { SEEventWebhook } from '../../types/sportsengine.js'
import { events } from '../data/events.js'

const event = events[0] // first game event

const updatedEvent = {
  ...event,
  venueId: 'venue-morse',
  status: 'scheduled' as const,
  notes: 'Venue changed — Bartholomew Field 1 unavailable due to maintenance. Moved to Morse Park.',
  updatedAt: new Date().toISOString(),
}

const webhookPayload: SEEventWebhook = {
  id: randomUUID(),
  type: 'event:update',
  organizationId: event.organizationId,
  occurredAt: updatedEvent.updatedAt,
  deliveredAt: new Date().toISOString(),
  data: updatedEvent,
}

console.log('\n[Webhook Simulation] event:update')
console.log('─'.repeat(60))
console.log(JSON.stringify(webhookPayload, null, 2))
console.log('─'.repeat(60))
console.log(`\n→ Event:    ${event.title ?? event.id}`)
console.log(`→ Change:   venue moved to Morse Park`)
console.log(`→ Note:     ${updatedEvent.notes}`)
console.log('\n[Next step] Lambda identifies all players on affected team.')
console.log('[Next step] Queues notification emails to parents via SES.\n')
