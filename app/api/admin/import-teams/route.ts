import { csvRowToAssignment, insertTeamsAndAssignments } from '@/lib/team-uploads'
import { ok, badRequest, serverError } from '@/lib/api-helpers'
import { logAudit, getAuditIP } from '@/lib/audit'

export async function POST(req: Request) {

  try {
    const { rows } = (await req.json()) as { rows: Record<string, string>[] }

    if (!rows?.length) return badRequest('No rows provided')

    const assignments = rows.map(csvRowToAssignment).filter(a => a.player_id && a.season)

    if (!assignments.length) return badRequest('No valid rows with player_id and season found')

    const season = assignments[0].season
    const result = await insertTeamsAndAssignments(assignments)

    logAudit({ action: 'import_teams', ip: getAuditIP(req), detail: { count: assignments.length, season } })

    return ok({
      total: rows.length,
      season,
      playersInserted: result.upserted,
      teamsInserted: result.teamsUpserted,
      assignmentsUpserted: result.upserted,
      skipped: rows.length - assignments.length,
    })
  } catch (e) {
    return serverError(e)
  }
}
