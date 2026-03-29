import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  const secret = process.env.SESSION_SECRET ?? ''

  // Replicate exactly what middleware does
  const parts = token?.split('.')
  if (!parts || parts.length !== 3) {
    return NextResponse.json({ error: 'bad token format' })
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch { /* ignore */ }

  const keyData = new TextEncoder().encode(secret)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, sigInput)

  return NextResponse.json({
    secretFirst8: secret.slice(0, 8),
    secretLength: secret.length,
    payload,
    signatureValid: valid,
  })
}
