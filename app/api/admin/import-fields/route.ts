import { cookies } from 'next/headers'
import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-helpers'

const FIELDS_TABLE = 'egs-fields'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value
  if (!token) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.admin) return false
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false

    const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
    const keyData = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const sigBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )
    return await crypto.subtle.verify('HMAC', key, sigBytes, sigInput)
  } catch {
    return false
  }
}

async function deleteAllFields(): Promise<void> {
  // Scan and delete all existing fields
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(
      new ScanCommand({
        TableName: FIELDS_TABLE,
        ProjectionExpression: 'id',
        ExclusiveStartKey: lastKey,
      }),
    )

    const items = res.Items ?? []
    if (items.length > 0) {
      // Delete in batches
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25)
        await db.send(
          new BatchWriteCommand({
            RequestItems: {
              [FIELDS_TABLE]: batch.map(item => ({ DeleteRequest: { Key: { id: item.id } } })),
            },
          }),
        )
      }
    }

    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)
}

async function batchWrite(items: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [FIELDS_TABLE]: batch.map(item => ({ PutRequest: { Item: item } })),
        },
      }),
    )
  }
}

export async function POST(req: Request) {
  if (!(await verifySession())) return unauthorized()

  try {
    const { rows } = (await req.json()) as { rows: Record<string, string>[] }

    if (!rows?.length) return badRequest('No rows provided')

    // Delete existing fields (replaces entire catalog)
    await deleteAllFields()

    let inserted = 0
    let skipped = 0
    const facilities = new Set<string>()
    const surfaceCounts: Record<string, number> = {}
    const fields: Record<string, unknown>[] = []

    for (const row of rows) {
      const id = row['id']?.trim()
      if (!id) {
        skipped++
        continue
      }

      const facility = row['facility']?.trim() ?? ''
      const address = row['address']?.trim() ?? ''
      const identifier = row['identifier']?.trim() ?? ''
      const surface = row['surface']?.trim().toLowerCase() ?? 'grass'

      if (facility) facilities.add(facility)
      surfaceCounts[surface] = (surfaceCounts[surface] ?? 0) + 1

      const displayName = identifier ? `${facility} — ${identifier}` : facility

      fields.push({
        id,
        facility,
        address,
        identifier,
        display_name: displayName,
        surface,
        travel_field: row['travel_field']?.toLowerCase() === 'yes' ? 1 : 0,
      })

      inserted++
    }

    if (fields.length > 0) {
      await batchWrite(fields as Record<string, unknown>[])
    }

    return ok({
      total: rows.length,
      inserted,
      skipped,
      facilities: facilities.size,
      surfaces: surfaceCounts,
    })
  } catch (e) {
    return serverError(e)
  }
}
