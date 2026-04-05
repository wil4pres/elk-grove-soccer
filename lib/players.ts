import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from './dynamo'

const TABLE = 'egs-players'

export interface PlayerRecord {
  player_id: string
  player_first_name: string
  player_last_name: string
  gender: string
  birth_date: string
  account_first_name: string
  account_last_name: string
  account_email: string
  account_phone: string
  address: string
  city: string
  state: string
  zip: string
  new_or_returning: string
  school_and_grade: string
  special_request: string
  volunteer_head_coach: string
  volunteer_assistant_coach: string
  registered_on: string
  registered_at: string
  status: string
  package_name: string
  season: string
}

/** Parse a CSV row into a PlayerRecord */
export function csvRowToPlayer(
  row: Record<string, string>,
  season: string,
): PlayerRecord {
  return {
    player_id: row['player_id']?.trim(),
    player_first_name: row['player_first_name']?.trim() ?? '',
    player_last_name: row['player_last_name']?.trim() ?? '',
    gender: row['gender']?.trim() ?? '',
    birth_date: row['birth_date']?.trim() ?? '',
    account_first_name: row['account_first_name']?.trim() ?? '',
    account_last_name: row['account_last_name']?.trim() ?? '',
    account_email: row['account_email']?.trim() ?? '',
    account_phone: row['account_phone']?.trim() ?? '',
    address: row['address']?.trim() ?? '',
    city: row['city']?.trim() ?? '',
    state: row['state']?.trim() ?? '',
    zip: row['zip']?.trim() ?? '',
    new_or_returning: row['New or Returning Player']?.trim() ?? '',
    school_and_grade: (row['School and Grade Fall 2025'] ?? row['School and Grade Fall 2026'] ?? '')?.trim(),
    special_request: row['Special Request - Team/Coach/Player']?.trim() ?? '',
    volunteer_head_coach: row['volunteer_head_coach']?.trim() ?? '',
    volunteer_assistant_coach: row['volunteer_assistant_coach']?.trim() ?? '',
    registered_on: row['registered_on']?.trim() ?? '',
    registered_at: row['registered_at']?.trim() ?? '',
    status: row['status']?.trim() ?? '',
    package_name: row['package_name']?.trim() ?? '',
    season,
  }
}

/** Fetch all existing player_ids for a given season */
export async function getExistingPlayerIds(season: string): Promise<Set<string>> {
  const ids = new Set<string>()
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': season },
        ProjectionExpression: 'player_id',
        ExclusiveStartKey: lastKey,
      }),
    )
    for (const item of res.Items ?? []) {
      ids.add(item.player_id as string)
    }
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return ids
}

/** Insert only new players (skip any player_id already in DynamoDB for that season) */
export async function insertNewPlayers(
  players: PlayerRecord[],
  existingIds: Set<string>,
): Promise<{ inserted: number; skipped: number }> {
  const newPlayers = players.filter(p => !existingIds.has(p.player_id))
  const skipped = players.length - newPlayers.length

  // DynamoDB BatchWrite — max 25 items per request
  for (let i = 0; i < newPlayers.length; i += 25) {
    const batch = newPlayers.slice(i, i + 25)
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: batch.map(item => ({
            PutRequest: { Item: item },
          })),
        },
      }),
    )
  }

  return { inserted: newPlayers.length, skipped }
}
