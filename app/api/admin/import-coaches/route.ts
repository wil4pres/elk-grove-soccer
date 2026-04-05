import { cookies } from 'next/headers'
import { csvRowToCoach, replaceCoachesForSeason } from '@/lib/coaches'
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
    const { rows } = (await req.json()) as { rows: Record<string, string>[] }

    if (!rows?.length) return badRequest('No rows provided')

    const coaches = rows.map(csvRowToCoach).filter((c): c is NonNullable<typeof c> => c !== null)
    const skipped = rows.length - coaches.length
    const season = coaches[0]?.season ?? rows[0]?.['season']?.trim() ?? 'Fall Recreation 2025'

    const result = await replaceCoachesForSeason(coaches, season)

    return ok({
      total: rows.length,
      inserted: result.inserted,
      skipped,
      uniqueCoaches: result.uniqueCoaches,
      uniqueTeams: result.uniqueTeams,
      season,
    })
  } catch (e) {
    return serverError(e)
  }
}
