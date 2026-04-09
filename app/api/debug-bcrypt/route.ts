import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { db } from '@/lib/dynamo'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'

// Temporary diagnostic endpoint — REMOVE AFTER DIAGNOSIS
export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get('p') ?? ''

  const envInfo = {
    ADMIN_PASSWORD_len: (process.env.ADMIN_PASSWORD ?? '').length,
    ADMIN_PASSWORD_prefix: (process.env.ADMIN_PASSWORD ?? '').substring(0, 7),
    DYNAMO_ACCESS_KEY_ID_prefix: (process.env.DYNAMO_ACCESS_KEY_ID ?? '').substring(0, 6),
    DYNAMO_REGION: process.env.DYNAMO_REGION ?? '(not set)',
    AWS_REGION: process.env.AWS_REGION ?? '(not set)',
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV ?? '(not set)',
    AWS_ACCESS_KEY_ID_prefix: (process.env.AWS_ACCESS_KEY_ID ?? '').substring(0, 6),
    AWS_WEB_IDENTITY_TOKEN: process.env.AWS_WEB_IDENTITY_TOKEN_FILE ? 'set' : 'not set',
    AWS_CONTAINER_URI: process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ? 'set' : 'not set',
  }

  // Test with the singleton db client
  let singletonOk = false
  let singletonError = ''
  try {
    const res = await db.send(new ScanCommand({ TableName: 'egs-fields', Limit: 1 }))
    singletonOk = true
  } catch (e) {
    singletonError = e instanceof Error ? e.message : String(e)
  }

  const storedHash = process.env.ADMIN_PASSWORD ?? ''
  let compareResult = false
  let compareError = ''
  try {
    if (storedHash) compareResult = await compare(password, storedHash)
  } catch (e) {
    compareError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    envInfo,
    singletonOk,
    singletonError,
    storedHashLen: storedHash.length,
    compareResult,
    compareError,
  })
}
