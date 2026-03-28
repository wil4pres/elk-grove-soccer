import { SignJWT, jwtVerify } from 'jose'

function secret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
  )
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret())
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret())
    return true
  } catch {
    return false
  }
}
