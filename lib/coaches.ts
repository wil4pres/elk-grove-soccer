import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from './dynamo'

const TABLE = 'egs-coaches'

export interface CoachRecord {
  id: string              // userId#season
  user_id: string
  season: string
  first_name: string
  last_name: string
  email: string
  mobile_number: string
  team_id: string
  team_name: string
  role: string
}

export function csvRowToCoach(row: Record<string, string>): CoachRecord | null {
  const firstName = row['first_name']?.trim() ?? ''
  const lastName = row['last_name']?.trim() ?? ''
  const season = row['season']?.trim() ?? ''

  if (!firstName || !lastName || !season) return null

  const userId = row['user_id']?.trim() ?? ''
  const id = `${userId}#${season}`

  return {
    id,
    user_id: userId,
    season,
    first_name: firstName,
    last_name: lastName,
    email: row['email']?.trim() ?? '',
    mobile_number: row['mobile_number']?.trim() ?? '',
    team_id: row['team_id']?.trim() ?? '',
    team_name: row['team_name']?.trim() ?? '',
    role: row['role']?.trim() ?? '',
  }
}

async function deleteAllCoachesForSeason(season: string): Promise<void> {
  console.log(`[coaches] Deleting all coaches for season: ${season}`)
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': season },
        ProjectionExpression: 'id',
        ExclusiveStartKey: lastKey,
      }),
    )

    const items = res.Items ?? []
    if (items.length > 0) {
      console.log(`[coaches] Found ${items.length} coaches to delete`)
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25)
        await db.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE]: batch.map(item => ({ DeleteRequest: { Key: { id: item.id } } })),
            },
          }),
        )
      }
    }

    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)
}

async function batchWrite(items: CoachRecord[]): Promise<void> {
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: batch.map(item => ({ PutRequest: { Item: item } })),
        },
      }),
    )
  }
}

export async function insertCoaches(
  coaches: CoachRecord[],
): Promise<{ inserted: number; uniqueCoaches: number; uniqueTeams: number }> {
  const uniqueCoaches = new Set(coaches.map(c => c.user_id).filter(Boolean))
  const uniqueTeams = new Set(coaches.map(c => c.team_name).filter(Boolean))

  if (coaches.length > 0) {
    await batchWrite(coaches)
  }

  return {
    inserted: coaches.length,
    uniqueCoaches: uniqueCoaches.size,
    uniqueTeams: uniqueTeams.size,
  }
}

export async function replaceCoachesForSeason(
  coaches: CoachRecord[],
  season: string,
): Promise<{ deleted: number; inserted: number; uniqueCoaches: number; uniqueTeams: number }> {
  // Delete all existing coaches for this season
  await deleteAllCoachesForSeason(season)

  // Insert new coaches
  const result = await insertCoaches(coaches)

  return {
    deleted: 0, // we don't track this precisely, but we deleted all
    ...result,
  }
}
