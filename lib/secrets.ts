import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

const ssm = new SSMClient({ region: process.env.DYNAMO_REGION ?? 'us-east-1' })

const cache = new Map<string, { value: string; expiresAt: number }>()
const TTL = 5 * 60 * 1000 // cache secrets for 5 minutes

async function getSecret(name: string): Promise<string> {
  const cached = cache.get(name)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  try {
    const res = await ssm.send(new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }))
    const value = res.Parameter?.Value ?? ''
    cache.set(name, { value, expiresAt: Date.now() + TTL })
    return value
  } catch (err) {
    console.error(`Failed to fetch secret ${name}:`, err)
    // Fall back to env var if SSM is unavailable (local dev)
    return ''
  }
}

export async function getSessionSecret(): Promise<string> {
  // Local dev: use env var. Production: use SSM.
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  return getSecret('/egs/SESSION_SECRET')
}

export async function getAdminPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD
  return getSecret('/egs/ADMIN_PASSWORD')
}
