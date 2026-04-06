import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { NextResponse } from 'next/server'

export async function GET() {
  const env = {
    region: process.env.DYNAMO_REGION ?? 'not set',
    nodeEnv: process.env.NODE_ENV,
  }

  try {
    const res = await db.send(new ScanCommand({ TableName: 'egs-fields', Limit: 1 }))
    return NextResponse.json({ ok: true, env, itemCount: res.Count })
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      env,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
