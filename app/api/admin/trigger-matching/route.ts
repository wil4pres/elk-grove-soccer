import { NextRequest, NextResponse } from 'next/server'
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { db } from '@/lib/dynamo'
import { logAudit } from '@/lib/audit'
import { getMatchingQueueUrl } from '@/lib/secrets'

const STATE_TABLE = 'egs-matching-state'
const STATE_ID = 'matching'
const SEASON = '2026'

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
    ...(process.env.DYNAMO_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID,
        secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY!,
      },
    }),
  })
}

// ─── GET — return current job state (step + progress) ─────────────────────────

export async function GET(req: NextRequest) {
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
  await setState({ status: 'idle', resetAt: new Date().toISOString() })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  logAudit({ action: 'reset_matching', ip })
  return NextResponse.json({ status: 'idle' })
}

// ─── POST — send SQS message to kick off Lambda worker ────────────────────────

export async function POST(req: NextRequest) {
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

    const queueUrl = await getMatchingQueueUrl()
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

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    logAudit({ action: 'run_matching', ip, detail: { season: SEASON, messageId: result.MessageId } })
    return NextResponse.json({ status: 'started', messageId: result.MessageId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[matching] POST error:', msg, e)
    return NextResponse.json({ error: 'Failed to start matching' }, { status: 500 })
  }
}
