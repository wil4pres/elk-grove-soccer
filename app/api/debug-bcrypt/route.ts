import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'

// Temporary diagnostic endpoint — REMOVE AFTER DIAGNOSIS
export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get('p') ?? ''

  const envInfo = {
    ADMIN_PASSWORD_len: (process.env.ADMIN_PASSWORD ?? '').length,
    DYNAMO_ACCESS_KEY_ID_prefix: (process.env.DYNAMO_ACCESS_KEY_ID ?? '').substring(0, 6),
    DYNAMO_REGION: process.env.DYNAMO_REGION ?? '',
    AWS_REGION: process.env.AWS_REGION ?? '',
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV ?? '',
    AWS_ACCESS_KEY_ID_prefix: (process.env.AWS_ACCESS_KEY_ID ?? '').substring(0, 6),
  }

  // Try SSM with explicit credentials if available
  let ssmValue = ''
  let ssmError = ''
  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
    const region = process.env.DYNAMO_REGION ?? process.env.AWS_REGION ?? 'us-east-1'
    const ssmConfig: Record<string, unknown> = { region }
    if (process.env.DYNAMO_ACCESS_KEY_ID) {
      ssmConfig.credentials = {
        accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID,
        secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY!,
      }
    }
    const ssm = new SSMClient(ssmConfig)
    const res = await ssm.send(new GetParameterCommand({ Name: '/egs/ADMIN_PASSWORD', WithDecryption: true }))
    ssmValue = res.Parameter?.Value ?? ''
  } catch (e) {
    ssmError = e instanceof Error ? e.message : String(e)
  }

  const envValue = process.env.ADMIN_PASSWORD ?? ''
  const storedHash = envValue || ssmValue

  let compareResult = false
  let compareError = ''
  try {
    if (storedHash) compareResult = await compare(password, storedHash)
  } catch (e) {
    compareError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    envInfo,
    ssmValueLen: ssmValue.length,
    ssmValuePrefix: ssmValue.substring(0, 7),
    ssmError,
    storedHashLen: storedHash.length,
    compareResult,
    compareError,
    passwordLen: password.length,
  })
}
