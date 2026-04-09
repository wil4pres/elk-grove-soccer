import { csvRowToCoach, replaceCoachesForSeason } from '@/lib/coaches'
import { ok, badRequest, serverError } from '@/lib/api-helpers'
import { logAudit, getAuditIP } from '@/lib/audit'

export async function POST(req: Request) {

  try {
    const { rows } = (await req.json()) as { rows: Record<string, string>[] }

    if (!rows?.length) return badRequest('No rows provided')

    const coaches = rows.map(csvRowToCoach).filter((c): c is NonNullable<typeof c> => c !== null)
    const skipped = rows.length - coaches.length
    const season = coaches[0]?.season ?? rows[0]?.['season']?.trim() ?? 'Fall Recreation 2025'

    console.log(`[import-coaches] Processing ${coaches.length} coaches for season ${season}`)
    const result = await replaceCoachesForSeason(coaches, season)

    logAudit({ action: 'import_coaches', ip: getAuditIP(req), detail: { count: coaches.length, season } })

    return ok({
      total: rows.length,
      inserted: result.inserted,
      skipped,
      uniqueCoaches: result.uniqueCoaches,
      uniqueTeams: result.uniqueTeams,
      season,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[import-coaches] Error:', msg, e)
    return serverError(e)
  }
}
