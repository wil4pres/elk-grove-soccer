import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await db.send(new ScanCommand({ TableName: 'egs-fields', Limit: 1 }))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
