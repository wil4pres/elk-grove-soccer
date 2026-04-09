import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, notFound, badRequest, unauthorized, serverError, requireAdminKey } from '@/lib/api-helpers'

const TABLE = 'egs-programs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const res = await db.send(new GetCommand({ TableName: TABLE, Key: { id } }))
    if (!res.Item) return notFound()
    return ok(res.Item)
  } catch (e) {
    return serverError(e)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdminKey(req)) return unauthorized()
  try {
    const { id } = await params
    const body = await req.json()
    if (!body.id || body.id !== id) return badRequest('id mismatch')
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
    return ok(item)
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdminKey(req)) return unauthorized()
  try {
    const { id } = await params
    await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
    return ok({ deleted: id })
  } catch (e) {
    return serverError(e)
  }
}
