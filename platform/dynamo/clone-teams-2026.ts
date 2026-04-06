/**
 * Clone all egs-teams season=2025 records into season=2026.
 * New team_id = original team_id + "-2026" to avoid key conflicts.
 * Run: npx tsx platform/dynamo/clone-teams-2026.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.DYNAMO_REGION ?? 'us-east-1',
})
const db = DynamoDBDocumentClient.from(client)

const TABLE = 'egs-teams'

async function main() {
  // Scan all 2025 teams
  const teams: Record<string, any>[] = []
  let lastKey: Record<string, unknown> | undefined
  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'season = :s',
      ExpressionAttributeValues: { ':s': '2025' },
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) teams.push(item)
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  console.log(`Found ${teams.length} teams for season 2025`)

  // Check if 2026 teams already exist
  const existing = await db.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'season = :s',
    ExpressionAttributeValues: { ':s': '2026' },
    Select: 'COUNT',
  }))
  if ((existing.Count ?? 0) > 0) {
    console.log(`⚠️  ${existing.Count} 2026 teams already exist. Aborting to avoid duplicates.`)
    process.exit(1)
  }

  // Build 2026 items
  const items2026 = teams.map(t => ({
    ...t,
    season: '2026',
    team_id: `${t.team_id}-2026`,
  }))

  // Batch write in chunks of 25 (DynamoDB limit)
  const CHUNK = 25
  let written = 0
  for (let i = 0; i < items2026.length; i += CHUNK) {
    const chunk = items2026.slice(i, i + CHUNK)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map(item => ({ PutRequest: { Item: item } })),
      },
    }))
    written += chunk.length
    process.stdout.write(`\r  Written ${written}/${items2026.length}...`)
  }

  console.log(`\n✅ Cloned ${written} teams → season 2026`)
}

main().catch(e => { console.error(e); process.exit(1) })
