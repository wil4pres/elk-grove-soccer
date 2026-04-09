import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'

const TABLE = 'egs-audit'
const ONE_YEAR_SEC = 365 * 24 * 60 * 60

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'run_matching'
  | 'reset_matching'
  | 'run_grand_assignment'
  | 'override_assignment'
  | 'approve_overflow'
  | 'send_emails'
  | 'import_players'
  | 'import_coaches'
  | 'import_teams'
  | 'import_fields'
  | 'delete_player'

interface AuditEntry {
  action: AuditAction
  ip: string
  detail?: Record<string, unknown>
}

/**
 * Write a structured audit log entry to egs-audit.
 * Fire-and-forget — never throws so it never blocks a response.
 * TTL = 1 year (auto-deleted by DynamoDB).
 */
export function logAudit(entry: AuditEntry): void {
  const now = Date.now()
  const item = {
    auditId: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    action: entry.action,
    ip: entry.ip,
    detail: entry.detail ?? {},
    timestamp: new Date(now).toISOString(),
    ttl: Math.floor(now / 1000) + ONE_YEAR_SEC,
  }

  db.send(new PutCommand({ TableName: TABLE, Item: item })).catch((err) => {
    console.error('[audit] Failed to write audit log:', err instanceof Error ? err.message : err)
  })
}

export function getAuditIP(req: Request): string {
  const fwd = (req as { headers: { get: (k: string) => string | null } }).headers.get('x-forwarded-for')
  return fwd?.split(',')[0].trim() ?? 'unknown'
}
