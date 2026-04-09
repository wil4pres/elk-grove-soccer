import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { getAdminPassword } from '@/lib/secrets'

// Temporary debug endpoint — REMOVE AFTER DIAGNOSIS
export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get('p') ?? ''
  const storedHash = await getAdminPassword()
  const hashLen = storedHash.length
  const hashPrefix = storedHash.substring(0, 7)
  let compareResult = false
  let compareError = ''
  try {
    compareResult = await compare(password, storedHash)
  } catch (e) {
    compareError = e instanceof Error ? e.message : String(e)
  }
  return NextResponse.json({
    hashLen,
    hashPrefix,
    compareResult,
    compareError,
    passwordLen: password.length,
    envSource: process.env.ADMIN_PASSWORD ? 'env' : 'ssm',
  })
}
