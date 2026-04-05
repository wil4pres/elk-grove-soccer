import { NextRequest, NextResponse } from 'next/server'
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { cookies } from 'next/headers'

const STATE_TABLE = 'egs-matching-state'
const STATE_ID = 'matching'

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

export async function GET(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await db.send(new GetCommand({
      TableName: STATE_TABLE,
      Key: { id: STATE_ID },
    }))

    const state = res.Item ?? { id: STATE_ID, status: 'idle' }
    return NextResponse.json(state)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[trigger-matching] Error getting state:', msg, e)
    // If table doesn't exist, return default idle state
    if (msg.includes('ResourceNotFoundException') || msg.includes('does not exist')) {
      return NextResponse.json({ id: STATE_ID, status: 'idle' })
    }
    return NextResponse.json({ id: STATE_ID, status: 'idle' })
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check current state
    const stateRes = await db.send(new GetCommand({
      TableName: STATE_TABLE,
      Key: { id: STATE_ID },
    }))

    const currentState = stateRes.Item as any

    // If already running, return error
    if (currentState?.status === 'running') {
      return NextResponse.json(
        { error: 'Matching already in progress' },
        { status: 409 }
      )
    }

    // Set state to running
    await db.send(new PutCommand({
      TableName: STATE_TABLE,
      Item: {
        id: STATE_ID,
        status: 'running',
        startedAt: new Date().toISOString(),
      },
    }))

    // Start matching process in background (don't await)
    triggerMatchingAsync()

    return NextResponse.json({
      status: 'started',
      message: 'Matching process started in background',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[trigger-matching] Error:', msg, e)
    return NextResponse.json({ error: msg || 'Failed to start matching' }, { status: 500 })
  }
}

// Run matching asynchronously without blocking response
async function triggerMatchingAsync() {
  try {
    const { runScoring } = await import('@/lib/matching-engine')
    const season = '2026'

    console.log('[matching] Starting background process for season', season)
    const results = await runScoring(season)

    // Mark as completed
    await db.send(new PutCommand({
      TableName: STATE_TABLE,
      Item: {
        id: STATE_ID,
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
    }))

    console.log('[matching] Completed. Results:', results.length, 'packages')
  } catch (e) {
    console.error('[matching] Failed:', e)
    const msg = e instanceof Error ? e.message : String(e)

    // Mark as failed
    await db.send(new PutCommand({
      TableName: STATE_TABLE,
      Item: {
        id: STATE_ID,
        status: 'failed',
        error: msg,
        completedAt: new Date().toISOString(),
      },
    }))
  }
}
