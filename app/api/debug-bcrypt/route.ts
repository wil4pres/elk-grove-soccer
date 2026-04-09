import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'

// Temporary diagnostic endpoint — REMOVE AFTER DIAGNOSIS
export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get('p') ?? ''

  // Directly fetch from SSM to bypass cache
  let ssmValue = ''
  let ssmError = ''
  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
    const ssm = new SSMClient({ region: 'us-east-1' })
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
    envValueLen: envValue.length,
    envValuePrefix: envValue.substring(0, 7),
    ssmValueLen: ssmValue.length,
    ssmValuePrefix: ssmValue.substring(0, 7),
    ssmError,
    storedHashLen: storedHash.length,
    compareResult,
    compareError,
    passwordLen: password.length,
  })
}
