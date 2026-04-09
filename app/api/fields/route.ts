import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, created, badRequest, unauthorized, serverError, requireAdminSession } from '@/lib/api-helpers'

const TABLE = 'egs-fields'

export async function GET() {
  try {
    const res = await db.send(new ScanCommand({ TableName: TABLE }))
    return ok(res.Items ?? [])
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  if (!await requireAdminSession(req)) return unauthorized()
  try {
    const body = await req.json()
    if (!body.id || !body.name) return badRequest('id and name are required')
    const item = {
      id: String(body.id).trim(),
      name: String(body.name ?? ''),
      complex: String(body.complex ?? ''),
      address: String(body.address ?? ''),
      parkingInfo: String(body.parkingInfo ?? ''),
      amenities: String(body.amenities ?? ''),
      status: String(body.status ?? 'open'),
      notes: String(body.notes ?? ''),
      updatedBy: String(body.updatedBy ?? ''),
      updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    }
    await db.send(new PutCommand({ TableName: TABLE, Item: item }))
    return created(item)
  } catch (e) {
    return serverError(e)
  }
}
