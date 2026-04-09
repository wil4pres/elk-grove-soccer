import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, created, badRequest, unauthorized, serverError, requireAdminKey } from '@/lib/api-helpers'

const TABLE = 'egs-programs'

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
      level: String(body.level ?? ''),
      ageBand: String(body.ageBand ?? ''),
      season: String(body.season ?? ''),
      price: Number(body.price ?? 0),
      capacity: Number(body.capacity ?? 0),
      enrolled: Number(body.enrolled ?? 0),
      registrationStatus: String(body.registrationStatus ?? ''),
      opensDate: body.opensDate ? String(body.opensDate) : undefined,
      description: String(body.description ?? ''),
      highlights: Array.isArray(body.highlights) ? body.highlights.map(String) : [],
      commitment: String(body.commitment ?? ''),
      whoIsItFor: String(body.whoIsItFor ?? ''),
    }
    await db.send(new PutCommand({ TableName: TABLE, Item: item }))
    return created(item)
  } catch (e) {
    return serverError(e)
  }
}
