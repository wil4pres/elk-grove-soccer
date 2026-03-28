import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, created, badRequest, unauthorized, serverError, requireAdminKey } from '@/lib/api-helpers'

const TABLE = 'egs-staff'

export async function GET() {
  try {
    const res = await db.send(new ScanCommand({ TableName: TABLE }))
    return ok(res.Items ?? [])
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  if (!requireAdminKey(req)) return unauthorized()
  try {
    const body = await req.json()
    if (!body.id || !body.name) return badRequest('id and name are required')
    await db.send(new PutCommand({ TableName: TABLE, Item: body }))
    return created(body)
  } catch (e) {
    return serverError(e)
  }
}
