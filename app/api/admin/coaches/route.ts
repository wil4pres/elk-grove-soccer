import { ScanCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, badRequest, serverError } from '@/lib/api-helpers'
import { randomUUID } from 'crypto'

const TABLE = 'egs-coaches'
const SEASON = '2026'

export async function GET() {
  try {
    const res = await db.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'season = :s AND begins_with(id, :prefix)',
        ExpressionAttributeValues: { ':s': SEASON, ':prefix': 'manual-' },
      })
    )
    const coaches = (res.Items ?? []).sort((a, b) =>
      `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)
    )
    return ok({ coaches })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, first_name, last_name, age_group, email, phone, practice_field } = body

    if (!first_name || !last_name || !age_group) {
      return badRequest('first_name, last_name, and age_group are required')
    }

    const coachId = id || `manual-${randomUUID()}`

    await db.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          id: coachId,
          season: SEASON,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          age_group,
          email: email?.trim() ?? '',
          mobile_number: phone?.trim() ?? '',
          practice_field: practice_field ?? '',
          // Keep these blank for manually-added coaches
          user_id: '',
          team_id: '',
          team_name: '',
          role: 'Head Coach',
        },
      })
    )

    return ok({ id: coachId })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('id is required')
    if (!id.startsWith('manual-')) return badRequest('Can only delete manually-added coaches')

    await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
    return ok({ deleted: id })
  } catch (e) {
    return serverError(e)
  }
}
