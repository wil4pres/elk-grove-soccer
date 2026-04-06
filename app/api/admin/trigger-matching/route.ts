import { NextRequest, NextResponse } from 'next/server'
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { db } from '@/lib/dynamo'
import { cookies } from 'next/headers'

const STATE_TABLE = 'egs-matching-state'
const STATE_ID = 'matching'
const SEASON = '2026'

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
    console.warn('[matching] State table unavailable:', msg)
  }
}

function getSQS(): SQSClient {
  return new SQSClient({
    region: process.env.DYNAMO_REGION ?? 'us-east-1',
  })
}

// ─── GET — return current job state (step + progress) ─────────────────────────

export async function GET(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state = await getState()

    // Auto-recover stuck jobs after 60 minutes (Lambda max timeout is 15 min,
    // but we give extra buffer for SQS retry delays)
    if (state.status === 'running' && state.startedAt) {
      const elapsed = Date.now() - new Date(state.startedAt as string).getTime()
      if (elapsed > 60 * 60 * 1000) {
        const recovered = {
          status: 'failed',
          error: 'Job timed out — no completion signal received after 60 min. Click Generate to retry.',
          completedAt: new Date().toISOString(),
        }
        await setState(recovered)
        return NextResponse.json({ id: STATE_ID, ...recovered })
      }
    }

    return NextResponse.json(state)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[matching] GET state error:', msg)
    return NextResponse.json({ id: STATE_ID, status: 'idle' })
  }
}

// ─── DELETE — force reset stuck job ───────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await setState({ status: 'idle', resetAt: new Date().toISOString() })
  return NextResponse.json({ status: 'idle' })
}

// ─── POST — send SQS message to kick off Lambda worker ────────────────────────

export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const currentState = await getState()
    if (currentState?.status === 'running') {
      // Allow override if stuck for more than 60 min
      if (currentState.startedAt) {
        const elapsed = Date.now() - new Date(currentState.startedAt as string).getTime()
        if (elapsed <= 60 * 60 * 1000) {
          return NextResponse.json({ error: 'Matching already in progress' }, { status: 409 })
        }
      } else {
        return NextResponse.json({ error: 'Matching already in progress' }, { status: 409 })
      }
    }

    const queueUrl = process.env.MATCHING_QUEUE_URL
    if (!queueUrl) {
      return NextResponse.json({ error: 'MATCHING_QUEUE_URL env var not set' }, { status: 500 })
    }

    const startedAt = new Date().toISOString()
    const sqs = getSQS()
    const result = await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ season: SEASON, startedAt }),
    }))

    await setState({
      status: 'running',
      startedAt,
      messageId: result.MessageId ?? null,
      currentStep: 'starting',
      stepLabel: 'Starting…',
      stepProgress: { current: 0, total: 0 },
    })

    return NextResponse.json({ status: 'started', messageId: result.MessageId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[matching] POST error:', msg, e)
    return NextResponse.json({ error: msg || 'Failed to start matching' }, { status: 500 })
  }
}
