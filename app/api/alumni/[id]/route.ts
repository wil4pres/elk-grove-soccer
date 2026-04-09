import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, notFound, badRequest, unauthorized, serverError, requireAdminSession } from '@/lib/api-helpers'

const TABLE = 'egs-alumni'

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
  if (!await requireAdminSession(req)) return unauthorized()
  try {
    const { id } = await params
    const body = await req.json()
    if (!body.id || body.id !== id) return badRequest('id mismatch')
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
    return ok(item)
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdminSession(req)) return unauthorized()
  try {
    const { id } = await params
    await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
    return ok({ deleted: id })
  } catch (e) {
    return serverError(e)
  }
}
