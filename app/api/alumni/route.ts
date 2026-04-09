import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, created, badRequest, unauthorized, serverError, requireAdminKey } from '@/lib/api-helpers'

const TABLE = 'egs-alumni'

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
    const item = {
      id: String(body.id).trim(),
      name: String(body.name ?? ''),
      gradYear: Number(body.gradYear ?? 0),
      currentRole: String(body.currentRole ?? ''),
      currentOrg: String(body.currentOrg ?? ''),
      quote: String(body.quote ?? ''),
      milestones: Array.isArray(body.milestones) ? body.milestones : [],
    }
    await db.send(new PutCommand({ TableName: TABLE, Item: item }))
    return created(item)
  } catch (e) {
    return serverError(e)
  }
}
