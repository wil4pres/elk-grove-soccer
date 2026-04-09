import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'

// Temporary diagnostic endpoint — REMOVE AFTER DIAGNOSIS
export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get('p') ?? ''

  // Check env
  const envInfo = {
    ADMIN_PASSWORD_len: (process.env.ADMIN_PASSWORD ?? '').length,
    DYNAMO_ACCESS_KEY_ID_prefix: (process.env.DYNAMO_ACCESS_KEY_ID ?? '').substring(0, 6),
    DYNAMO_REGION: process.env.DYNAMO_REGION ?? '(not set)',
    AWS_REGION: process.env.AWS_REGION ?? '(not set)',
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV ?? '(not set)',
    AWS_ACCESS_KEY_ID_prefix: (process.env.AWS_ACCESS_KEY_ID ?? '').substring(0, 6),
  }

  // Test DynamoDB
  let dynamoOk = false
  let dynamoError = ''
  try {
    const { DynamoDBClient, ListTablesCommand } = await import('@aws-sdk/client-dynamodb')
    const dynamo = new DynamoDBClient({ region: 'us-east-1' })
    const res = await dynamo.send(new ListTablesCommand({ Limit: 1 }))
    dynamoOk = true
  } catch (e) {
    dynamoError = e instanceof Error ? e.message : String(e)
  }

  // Test SSM with DYNAMO creds fallback
  let ssmValue = ''
  let ssmError = ''
  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
    const ssmConfig: Record<string, unknown> = { region: 'us-east-1' }
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
    dynamoOk,
    dynamoError,
    ssmValueLen: ssmValue.length,
    ssmError,
    storedHashLen: storedHash.length,
    compareResult,
    compareError,
  })
}
