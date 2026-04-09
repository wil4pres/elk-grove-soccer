import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, created, badRequest, unauthorized, serverError, requireAdminSession } from '@/lib/api-helpers'

const TABLE = 'egs-sponsors'

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
      tier: String(body.tier ?? ''),
      tagline: String(body.tagline ?? ''),
      initials: String(body.initials ?? ''),
      ctaLabel: String(body.ctaLabel ?? ''),
      ctaHref: String(body.ctaHref ?? ''),
    }
    await db.send(new PutCommand({ TableName: TABLE, Item: item }))
    return created(item)
  } catch (e) {
    return serverError(e)
  }
}
