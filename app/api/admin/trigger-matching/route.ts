import { NextRequest, NextResponse } from 'next/server'
import { PutCommand, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { cookies } from 'next/headers'

const STATE_TABLE = 'egs-matching-state'
const STATE_ID = 'matching'
const PLAYERS_TABLE = 'egs-players'
const SEASON = '2026'
const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch'
const BATCH_SIZE = 1000
const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'
const SKIP_REQUESTS = new Set(['n/a', 'na', 'none', '-', 'no', 'no request', 'n a', ''])

// ─── Auth ──────────────────────────────────────────────────────────────────────

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

// ─── State helpers ─────────────────────────────────────────────────────────────

async function getState(): Promise<{ status: string; [key: string]: unknown }> {
  try {
    const res = await db.send(new GetCommand({ TableName: STATE_TABLE, Key: { id: STATE_ID } }))
    return (res.Item as any) ?? { id: STATE_ID, status: 'idle' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('ResourceNotFoundException') || msg.includes('does not exist') || msg.includes('Requested resource not found')) {
      return { id: STATE_ID, status: 'idle' }
    }
    throw e
  }
}

async function setState(item: Record<string, unknown>): Promise<void> {
  try {
    await db.send(new PutCommand({ TableName: STATE_TABLE, Item: { id: STATE_ID, ...item } }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[matching] State table unavailable — state not persisted:', msg)
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await getState())
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[matching] GET state error:', msg)
    return NextResponse.json({ id: STATE_ID, status: 'idle' })
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const currentState = await getState()
    if (currentState?.status === 'running') {
      return NextResponse.json({ error: 'Matching already in progress' }, { status: 409 })
    }

    await setState({ status: 'running', startedAt: new Date().toISOString() })

    // Fire-and-forget — does not block response
    triggerMatchingAsync()

    return NextResponse.json({ status: 'started', message: 'Processing started in background' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[matching] POST error:', msg, e)
    return NextResponse.json({ error: msg || 'Failed to start matching' }, { status: 500 })
  }
}

// ─── Background processing ─────────────────────────────────────────────────────

async function triggerMatchingAsync() {
  const runId = new Date().toISOString()
  console.log(`[matching:${runId}] ============ Starting background processing ============`)

  try {
    // ── Load players ─────────────────────────────────────────────────────────
    console.log(`[matching:${runId}] Loading players from ${PLAYERS_TABLE} (season ${SEASON})...`)
    const players: Record<string, any>[] = []
    let lastKey: Record<string, unknown> | undefined
    do {
      const res = await db.send(new ScanCommand({
        TableName: PLAYERS_TABLE,
        FilterExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': SEASON },
        ExclusiveStartKey: lastKey,
      }))
      for (const item of res.Items ?? []) players.push(item)
      lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (lastKey)

    if (!players.length) {
      throw new Error(`No players found for season ${SEASON}`)
    }
    console.log(`[matching:${runId}] Loaded ${players.length} players`)

    // ── Geocoding ─────────────────────────────────────────────────────────────
    const needGeo = players.filter(p => p.address?.trim() && (p.lat == null || p.lng == null))
    console.log(`[matching:${runId}] Geocoding: ${needGeo.length}/${players.length} players need geocoding`)

    if (needGeo.length > 0) {
      const totalBatches = Math.ceil(needGeo.length / BATCH_SIZE)
      let totalGeocoded = 0

      for (let i = 0; i < needGeo.length; i += BATCH_SIZE) {
        const batch = needGeo.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        console.log(`[matching:${runId}] Geocoding batch ${batchNum}/${totalBatches} (${batch.length} addresses)`)

        try {
          const results = await geocodeBatch(batch.map(p => ({
            player_id: p.player_id,
            address: p.address ?? '',
            city: p.city ?? '',
            state: p.state ?? '',
            zip: p.zip ?? '',
          })))

          for (const [playerId, { lat, lng }] of results) {
            await db.send(new UpdateCommand({
              TableName: PLAYERS_TABLE,
              Key: { player_id: playerId, season: SEASON },
              UpdateExpression: 'SET lat = :lat, lng = :lng',
              ExpressionAttributeValues: { ':lat': lat, ':lng': lng },
            }))
            // Update local player record so AI step uses latest data
            const p = players.find(p => p.player_id === playerId)
            if (p) { p.lat = lat; p.lng = lng }
          }

          totalGeocoded += results.size
          console.log(`[matching:${runId}] Geocoding batch ${batchNum}: ${results.size}/${batch.length} matched`)
        } catch (e) {
          console.error(`[matching:${runId}] Geocoding batch ${batchNum} error:`, e instanceof Error ? e.message : e)
        }
      }

      console.log(`[matching:${runId}] Geocoding complete: ${totalGeocoded}/${needGeo.length} matched`)
    } else {
      console.log(`[matching:${runId}] All players already geocoded`)
    }

    // ── Load previous season players for historical context ──────────────────
    // Match by account_email + birth_date to find the same child from last year
    const prevSeason = String(parseInt(SEASON) - 1)
    const prevPlayers: Record<string, any>[] = []
    let prevKey: Record<string, unknown> | undefined
    do {
      const res = await db.send(new ScanCommand({
        TableName: PLAYERS_TABLE,
        FilterExpression: 'season = :s',
        ExpressionAttributeValues: { ':s': prevSeason },
        ExclusiveStartKey: prevKey,
      }))
      for (const item of res.Items ?? []) prevPlayers.push(item)
      prevKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (prevKey)
    console.log(`[matching:${runId}] Loaded ${prevPlayers.length} players from ${prevSeason} for history`)

    // Build lookup: "email|birthdate" → prev special_request
    const prevRequestMap = new Map<string, string>()
    for (const p of prevPlayers) {
      if (p.account_email && p.birth_date && p.special_request) {
        prevRequestMap.set(`${p.account_email}|${p.birth_date}`, p.special_request)
      }
    }

    // ── AI Extraction ─────────────────────────────────────────────────────────
    // Re-extract if school_and_grade changed (extraction_school missing) or if
    // extraction has never run. Always extract even if no special_request (school parsing).
    const needExtract = players.filter(p => !p.extraction_coaches)
    console.log(`[matching:${runId}] AI extraction: ${needExtract.length} players need extraction`)

    if (needExtract.length > 0) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        console.warn(`[matching:${runId}] ANTHROPIC_API_KEY not set — skipping AI extraction`)
      } else {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const client = new Anthropic({ apiKey })
        let ok = 0
        let failed = 0

        for (const p of needExtract) {
          try {
            const prevReq = prevRequestMap.get(`${p.account_email}|${p.birth_date}`) ?? null
            const ex = await extractRequest(client, {
              firstName: p.player_first_name ?? '',
              lastName: p.player_last_name ?? '',
              specialRequest: p.special_request ?? '',
              prevSpecialRequest: prevReq,
              schoolAndGrade: p.school_and_grade ?? '',
              newOrReturning: p.new_or_returning ?? '',
            })

            await db.send(new UpdateCommand({
              TableName: PLAYERS_TABLE,
              Key: { player_id: p.player_id, season: SEASON },
              UpdateExpression: 'SET extraction_coaches = :c, extraction_friends = :f, extraction_siblings = :sb, extraction_teams = :t, extraction_school = :sc, extraction_notes = :n',
              ExpressionAttributeValues: {
                ':c': ex.coaches ?? [],
                ':f': ex.friends ?? [],
                ':sb': ex.siblings ?? [],
                ':t': ex.teams ?? [],
                ':sc': ex.school_name ?? '',
                ':n': ex.notes ?? '',
              },
            }))

            // Update in-memory record so scorer sees latest data immediately
            p.extraction_coaches = ex.coaches ?? []
            p.extraction_friends = ex.friends ?? []
            p.extraction_siblings = ex.siblings ?? []
            p.extraction_teams = ex.teams ?? []
            p.extraction_school = ex.school_name ?? ''
            p.extraction_notes = ex.notes ?? ''

            ok++
            const parts = []
            if (ex.coaches.length) parts.push(`coaches: ${ex.coaches.join(', ')}`)
            if (ex.friends.length) parts.push(`friends: ${ex.friends.join(', ')}`)
            if (ex.siblings.length) parts.push(`siblings: ${ex.siblings.join(', ')}`)
            if (ex.teams.length) parts.push(`teams: ${ex.teams.join(', ')}`)
            if (ex.school_name) parts.push(`school: ${ex.school_name}`)
            if (ex.notes) parts.push(`notes: ${ex.notes}`)
            console.log(`[matching:${runId}] ${p.player_first_name} ${p.player_last_name}: ${parts.length ? parts.join(' | ') : '(no extractable data)'}`)
          } catch (e) {
            failed++
            console.error(`[matching:${runId}] Extraction failed for ${p.player_first_name} ${p.player_last_name}:`, e instanceof Error ? e.message : e)
          }

          // Rate limiting: ~3 req/sec
          await new Promise(r => setTimeout(r, 350))
        }

        console.log(`[matching:${runId}] AI extraction complete: ${ok} succeeded, ${failed} failed`)
      }
    } else {
      console.log(`[matching:${runId}] All players already extracted`)
    }

    await setState({ status: 'completed', completedAt: new Date().toISOString() })
    console.log(`[matching:${runId}] ============ Processing complete ============`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[matching:${runId}] ============ Processing FAILED: ${msg} ============`, e)
    await setState({ status: 'failed', error: msg, completedAt: new Date().toISOString() })
  }
}

// ─── Geocoding helper ──────────────────────────────────────────────────────────

interface GeoInput { player_id: string; address: string; city: string; state: string; zip: string }

async function geocodeBatch(batch: GeoInput[]): Promise<Map<string, { lat: number; lng: number }>> {
  const csv = batch
    .map(p => `${p.player_id},"${(p.address || '').replace(/"/g, '')}","${p.city || 'Elk Grove'}","${p.state || 'CA'}","${p.zip || ''}"`)
    .join('\n')

  const form = new FormData()
  form.append('addressFile', new Blob([csv], { type: 'text/csv' }), 'addresses.csv')
  form.append('benchmark', 'Public_AR_Current')

  const res = await fetch(CENSUS_URL, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Census geocoder HTTP ${res.status}`)

  const results = new Map<string, { lat: number; lng: number }>()
  for (const line of (await res.text()).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    const id = parts[0].replace(/"/g, '').trim()
    if (!id) continue
    if (parts[2]?.replace(/"/g, '').trim() !== 'Match') continue
    const coords = parts[5]?.replace(/"/g, '').trim()
    if (!coords) continue
    const [lngStr, latStr] = coords.split(',')
    const lng = parseFloat(lngStr)
    const lat = parseFloat(latStr)
    if (!isNaN(lat) && !isNaN(lng)) results.set(id, { lat, lng })
  }
  return results
}

// ─── AI extraction helper ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You extract structured information from youth soccer registration data.
Return ONLY valid JSON with these keys:
  coaches:     string[]  — coach last names or full names explicitly requested
  friends:     string[]  — player/child names requested as friend or teammate (NOT family/siblings)
  siblings:    string[]  — names mentioned as brother, sister, or sibling (family placement)
  teams:       string[]  — team nicknames mentioned
  school_name: string    — clean school name parsed from the school field, or "" if not present
  notes:       string    — one short sentence capturing important context not covered above (scheduling constraints, play-up requests, strong preferences), else ""

Rules:
- Do NOT include the registering player's own name in any list
- If a request says "brother", "sister", or "sibling", put that name in siblings NOT friends
- For school_name: extract just the school name, drop grade/year info. E.g. "Kerr Middle school - 8th grade" → "Kerr Middle School"
- If prev_special_request is provided and this season's request is empty or vague, use the previous request to infer coaches/friends/teams the family has historically wanted — add a note if you're drawing from history
- If nothing fits a category, return [] or ""
- Return raw JSON only, no markdown fences`

interface Extraction { coaches: string[]; friends: string[]; siblings: string[]; teams: string[]; school_name: string; notes: string }

interface ExtractionInput {
  firstName: string
  lastName: string
  specialRequest: string
  prevSpecialRequest: string | null
  schoolAndGrade: string
  newOrReturning: string
}

async function extractRequest(client: any, input: ExtractionInput): Promise<Extraction> {
  const lines = [
    `Player: ${input.firstName} ${input.lastName}`,
    `New or returning: ${input.newOrReturning || 'unknown'}`,
    `School/grade field: "${input.schoolAndGrade}"`,
    `Current special request: "${input.specialRequest || 'none'}"`,
  ]
  if (input.prevSpecialRequest) {
    lines.push(`Previous season request: "${input.prevSpecialRequest}"`)
  }

  const msg = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: lines.join('\n') }],
  })

  const text = (msg.content[0] as any).text.trim()
  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error(`Unparseable response: ${text}`)
  }
}
