import { SignJWT, jwtVerify } from 'jose'
import { authConfig } from './config'
import { SessionPayload, VerifyResult } from './types'
import { getSessionSecret } from '@/lib/secrets'

async function secret() {
  const key = await getSessionSecret()
  return new TextEncoder().encode(key || authConfig.sessionSecret)
}

export async function createSessionToken(): Promise<string> {
  try {
    const payload: SessionPayload = { admin: true }

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(authConfig.sessionDuration)
      .sign(await secret())
  } catch (error) {
    console.error('Failed to create session token:', error)
    throw new Error('Session creation failed')
  }
}

export async function verifySessionToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, await secret())

    return {
      valid: true,
      payload: payload as SessionPayload
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn('Session verification failed:', errorMessage)

    return {
      valid: false,
      error: errorMessage
    }
  }
}

export async function isSessionValid(token: string): Promise<boolean> {
  const result = await verifySessionToken(token)
  return result.valid
}

export function isTokenExpiringSoon(payload: SessionPayload, bufferMinutes = 30): boolean {
  if (!payload.exp) return false

  const now = Math.floor(Date.now() / 1000)
  const bufferSeconds = bufferMinutes * 60

  return payload.exp - now <= bufferSeconds
}

export async function refreshSessionTokenIfNeeded(token: string): Promise<string | null> {
  const verifyResult = await verifySessionToken(token)

  if (!verifyResult.valid || !verifyResult.payload) {
    return null
  }

  if (isTokenExpiringSoon(verifyResult.payload)) {
    return await createSessionToken()
  }

  return null
}