/**
 * Simulate: registrationResult:update
 *
 * Fired when a registration result changes — e.g. payment confirmed,
 * special request edited, or status changes. Run with:
 *   npm run webhook:registration-update
 */

import { randomUUID } from 'crypto'
import type { SERegistrationResultWebhook } from '../../types/sportsengine.js'
import { registrationResults } from '../data/registrationResults.js'

const rr = registrationResults[0] // simulate update on first record

const updatedRR = {
  ...rr,
  notes: 'Parent called to confirm — coach preference is Bailey or Martinez.',
  updatedAt: new Date().toISOString(),
}

const webhookPayload: SERegistrationResultWebhook = {
  id: randomUUID(),
  type: 'registrationResult:update',
  organizationId: rr.organizationId,
  occurredAt: updatedRR.updatedAt,
  deliveredAt: new Date().toISOString(),
  data: updatedRR,
}

console.log('\n[Webhook Simulation] registrationResult:update')
console.log('─'.repeat(60))
console.log(JSON.stringify(webhookPayload, null, 2))
console.log('─'.repeat(60))
console.log(`\n→ Updated:  ${rr.id}`)
console.log(`→ Change:   notes added`)
console.log('\n[Next step] Lambda checks if already assigned — if so, may trigger re-scoring.\n')
