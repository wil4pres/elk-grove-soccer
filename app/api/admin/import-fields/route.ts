import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, badRequest, serverError } from '@/lib/api-helpers'
import { logAudit, getAuditIP } from '@/lib/audit'

const FIELDS_TABLE = 'egs-fields'

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

    logAudit({ action: 'import_fields', ip: getAuditIP(req), detail: { inserted, skipped } })

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
