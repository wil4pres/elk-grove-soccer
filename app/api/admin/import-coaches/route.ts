import { cookies } from 'next/headers'
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-helpers'

const COACHES_TABLE = 'egs-coaches'

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

async function batchWrite(items: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [COACHES_TABLE]: batch.map(item => ({ PutRequest: { Item: item } })),
        },
      }),
    )
  }
}

export async function POST(req: Request) {
  if (!(await verifySession())) return unauthorized()

  try {
    const { rows } = (await req.json()) as { rows: Record<string, string>[] }

    if (!rows?.length) return badRequest('No rows provided')

    let inserted = 0
    let skipped = 0
    const uniqueCoaches = new Set<string>()
    const uniqueTeams = new Set<string>()
    const coaches: Record<string, unknown>[] = []

    for (const row of rows) {
      const firstName = row['first_name']?.trim() ?? ''
      const lastName = row['last_name']?.trim() ?? ''

      if (!firstName || !lastName) {
        skipped++
        continue
      }

      const userId = row['user_id']?.trim() ?? ''
      const season = row['season']?.trim() ?? ''

      if (!season) {
        skipped++
        continue
      }

      if (userId) uniqueCoaches.add(userId)

      const teamName = row['team_name']?.trim() ?? ''
      if (teamName) uniqueTeams.add(teamName)

      const id = `${userId}#${season}` // Composite key
      coaches.push({
        id,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email: row['email']?.trim() ?? '',
        mobile_number: row['mobile_number']?.trim() ?? '',
        team_id: row['team_id']?.trim() ?? '',
        team_name: teamName,
        season,
        role: row['role']?.trim() ?? '',
      })

      inserted++
    }

    if (coaches.length > 0) {
      await batchWrite(coaches as Record<string, unknown>[])
    }

    const detectedSeason = rows[0]?.['season']?.trim() ?? 'Fall Recreation 2025'

    return ok({
      total: rows.length,
      inserted,
      skipped,
      uniqueCoaches: uniqueCoaches.size,
      uniqueTeams: uniqueTeams.size,
      season: detectedSeason,
    })
  } catch (e) {
    return serverError(e)
  }
}
