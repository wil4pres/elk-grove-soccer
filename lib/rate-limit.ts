import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'

const TABLE = 'egs-rate-limits'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * DynamoDB-backed sliding window rate limiter.
 * Safe across multiple Amplify instances.
 *
 * Uses atomic UpdateItem to increment a counter within a time window.
 * TTL on each entry ensures DynamoDB auto-cleans expired records.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSec = Math.ceil(windowMs / 1000)
  const now = Math.floor(Date.now() / 1000) // Unix seconds
  const windowStart = now - windowSec

  try {
    // Atomically increment count; reset if window has expired
    const res = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: key },
      UpdateExpression: `
        SET #count = if_not_exists(#count, :zero) + :one,
            windowStart = if_not_exists(windowStart, :now),
            #ttl = :expiry
        `,
      ConditionExpression: 'attribute_not_exists(windowStart) OR windowStart > :windowStart',
      ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':now': now,
        ':windowStart': windowStart,
        ':expiry': now + windowSec + 60,
      },
      ReturnValues: 'ALL_NEW',
    }))

    const count = (res.Attributes?.count as number) ?? 1
    const allowed = count <= maxRequests
    return {
      allowed,
      remaining: Math.max(0, maxRequests - count),
      retryAfterSec: windowSec,
    }
  } catch (err: unknown) {
    // Window expired — reset the entry and allow this request
    if ((err as { name?: string })?.name === 'ConditionalCheckFailedException') {
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: key },
        UpdateExpression: 'SET #count = :one, windowStart = :now, #ttl = :expiry',
        ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':one': 1,
          ':now': now,
          ':expiry': now + windowSec + 60,
        },
      }))
      return { allowed: true, remaining: maxRequests - 1, retryAfterSec: windowSec }
    }

    // DynamoDB unavailable — fail open to avoid locking out legitimate users
    console.error('[rate-limit] DynamoDB error, failing open:', err instanceof Error ? err.message : err)
    return { allowed: true, remaining: maxRequests, retryAfterSec: windowSec }
  }
}
