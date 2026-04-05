/**
 * Process players: geocode addresses + extract special requests via Claude.
 * Reads from egs-players in DynamoDB, updates records in place.
 * SSE-streamed for real-time progress in the admin UI.
 */

import { NextRequest } from 'next/server'
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { isSessionValid } from '@/lib/auth/session'
import Anthropic from '@anthropic-ai/sdk'

const TABLE = 'egs-players'
const SEASON = '2026'
const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch'
const BATCH_SIZE = 1000

// ─── Census geocoder ───────────────────────────────────────────────────────────

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

// ─── Claude extraction ─────────────────────────────────────────────────────────

const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_PROMPT = `You extract structured information from youth soccer registration special requests.
Return ONLY valid JSON with these keys:
  coaches: string[]   — coach full names or last names mentioned
  friends: string[]   — player/child names mentioned as friend/teammate requests
  teams:   string[]   — team nicknames mentioned
  notes:   string     — one short sentence if there is important context not captured above, else ""

Rules:
- Include a name even if only partially mentioned (last name only is fine)
- Do NOT include the registering player's own name
- If nothing fits a category, return an empty array []
- Return raw JSON only, no markdown fences`

const SKIP_REQUESTS = new Set(['n/a', 'na', 'none', '-', 'no', 'no request', 'n a', ''])

interface Extraction { coaches: string[]; friends: string[]; teams: string[]; notes: string }

async function extractRequest(
  client: Anthropic,
  firstName: string,
  lastName: string,
  request: string,
): Promise<Extraction> {
  const msg = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Player: ${firstName} ${lastName}\nSpecial request: "${request}"` }],
  })

  const text = (msg.content[0] as any).text.trim()
  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error(`Unparseable: ${text}`)
  }
}

// ─── main route ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: 'log' | 'step' | 'done' | 'error', msg: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, msg })}\n\n`))

      try {
        // Load all players for current season
        send('step', `Loading players from DynamoDB (season ${SEASON})...`)
        const players: Record<string, any>[] = []
        let lastKey: Record<string, unknown> | undefined
        do {
          const res = await db.send(new ScanCommand({
            TableName: TABLE,
            FilterExpression: 'season = :s',
            ExpressionAttributeValues: { ':s': SEASON },
            ExclusiveStartKey: lastKey,
          }))
          for (const item of res.Items ?? []) players.push(item)
          lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
        } while (lastKey)

        if (!players.length) {
          throw new Error(`No players found for season ${SEASON}. Upload players on the Uploads page first.`)
        }
        send('log', `${players.length} players loaded`)

        // ── Geocoding ───────────────────────────────────────────────────────
        send('step', 'Geocoding player addresses...')
        const needGeo = players.filter(
          p => p.address && p.address.trim() && (p.lat == null || p.lng == null)
        )

        if (needGeo.length === 0) {
          send('log', 'All players already geocoded')
        } else {
          send('log', `${needGeo.length} players need geocoding`)
          let totalMatched = 0
          const totalBatches = Math.ceil(needGeo.length / BATCH_SIZE)

          for (let i = 0; i < needGeo.length; i += BATCH_SIZE) {
            const batch = needGeo.slice(i, i + BATCH_SIZE)
            const batchNum = Math.floor(i / BATCH_SIZE) + 1
            send('log', `  Batch ${batchNum}/${totalBatches} (${batch.length} addresses)...`)

            const geoInputs: GeoInput[] = batch.map(p => ({
              player_id: p.player_id,
              address: p.address ?? '',
              city: p.city ?? '',
              state: p.state ?? '',
              zip: p.zip ?? '',
            }))

            const results = await geocodeBatch(geoInputs)

            // Update DynamoDB records with lat/lng
            for (const [playerId, { lat, lng }] of results) {
              await db.send(new UpdateCommand({
                TableName: TABLE,
                Key: { player_id: playerId, season: SEASON },
                UpdateExpression: 'SET lat = :lat, lng = :lng',
                ExpressionAttributeValues: { ':lat': lat, ':lng': lng },
              }))
            }

            totalMatched += results.size
            send('log', `  Batch ${batchNum}: ${results.size}/${batch.length} matched`)
          }
          send('log', `Geocoded ${totalMatched}/${needGeo.length} players`)
        }

        // ── AI Extraction ───────────────────────────────────────────────────
        send('step', 'Extracting special requests via AI...')
        const needExtract = players.filter(
          p => p.special_request &&
               !SKIP_REQUESTS.has((p.special_request || '').toLowerCase().trim()) &&
               !p.extraction_coaches  // not yet extracted
        )

        if (needExtract.length === 0) {
          send('log', 'All special requests already extracted')
        } else {
          send('log', `${needExtract.length} requests need AI extraction`)

          const apiKey = process.env.ANTHROPIC_API_KEY
          if (!apiKey) {
            send('log', 'ANTHROPIC_API_KEY not set — skipping extraction')
          } else {
            const client = new Anthropic({ apiKey })
            let ok = 0
            let failed = 0

            for (const p of needExtract) {
              try {
                const ex = await extractRequest(
                  client,
                  p.player_first_name ?? '',
                  p.player_last_name ?? '',
                  p.special_request,
                )

                await db.send(new UpdateCommand({
                  TableName: TABLE,
                  Key: { player_id: p.player_id, season: SEASON },
                  UpdateExpression: 'SET extraction_coaches = :c, extraction_friends = :f, extraction_teams = :t, extraction_notes = :n',
                  ExpressionAttributeValues: {
                    ':c': ex.coaches ?? [],
                    ':f': ex.friends ?? [],
                    ':t': ex.teams ?? [],
                    ':n': ex.notes ?? '',
                  },
                }))

                ok++
                const parts = []
                if (ex.coaches.length) parts.push(`coaches: ${ex.coaches.join(', ')}`)
                if (ex.friends.length) parts.push(`friends: ${ex.friends.join(', ')}`)
                if (ex.teams.length) parts.push(`teams: ${ex.teams.join(', ')}`)
                send('log', `  ${p.player_first_name} ${p.player_last_name}: ${parts.length ? parts.join(' | ') : '(no match)'}`)
              } catch (e) {
                failed++
                send('log', `  ${p.player_first_name} ${p.player_last_name}: ERROR - ${e instanceof Error ? e.message : String(e)}`)
              }

              // Rate limiting: ~3 req/sec
              await new Promise(r => setTimeout(r, 350))
            }
            send('log', `Extracted ${ok}/${needExtract.length} (${failed} failed)`)
          }
        }

        send('done', 'Processing complete. Matching data is ready.')
      } catch (e) {
        send('error', e instanceof Error ? e.message : String(e))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
