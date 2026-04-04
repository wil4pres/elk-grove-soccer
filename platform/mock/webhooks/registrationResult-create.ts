/**
 * Simulate: registrationResult:create
 *
 * Fired when a new player registers. This is the primary trigger
 * for the assignment engine. Run with:
 *   npm run webhook:registration-create
 */

import { randomUUID } from 'crypto'
import type { SERegistrationResultWebhook } from '../../types/sportsengine.js'
import { registrationResults } from '../data/registrationResults.js'

// Pick a random pending registration result to simulate
const pending = registrationResults.filter(r => !r.teamId)
const rr = pending[Math.floor(Math.random() * pending.length)]

if (!rr) {
  console.error('No pending registration results to simulate.')
  process.exit(1)
}

const webhookPayload: SERegistrationResultWebhook = {
  id: randomUUID(),
  type: 'registrationResult:create',
  organizationId: rr.organizationId,
  occurredAt: rr.createdAt,
  deliveredAt: new Date().toISOString(),
  data: rr,
}

console.log('\n[Webhook Simulation] registrationResult:create')
console.log('─'.repeat(60))
console.log(JSON.stringify(webhookPayload, null, 2))
console.log('─'.repeat(60))
console.log(`\n→ Player profile: ${rr.profileId}`)
console.log(`→ Package:        ${rr.packageName}`)
console.log(`→ Season:         ${rr.seasonId}`)
console.log('\n[Next step] This payload would be written to SQS.')
console.log('[Next step] Lambda deduplicates via egs-webhook-events, then runs scoring engine.\n')
