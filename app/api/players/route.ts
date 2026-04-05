import { cookies } from 'next/headers'
import { csvRowToPlayer, getExistingPlayerIds, insertNewPlayers } from '@/lib/players'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-helpers'

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

export async function POST(req: Request) {
  if (!(await verifySession())) return unauthorized()

  try {
    const { rows, season } = (await req.json()) as {
      rows: Record<string, string>[]
      season: string
    }

    if (!rows?.length) return badRequest('No rows provided')
    if (!season) return badRequest('Season year is required')

    const players = rows
      .map(r => csvRowToPlayer(r, season))
      .filter(p => p.player_id)

    const existingIds = await getExistingPlayerIds(season)
    const result = await insertNewPlayers(players, existingIds)

    return ok({
      total: rows.length,
      ...result,
    })
  } catch (e) {
    return serverError(e)
  }
}
