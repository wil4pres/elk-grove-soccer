const cache = new Map<string, { value: string; expiresAt: number }>()
const TTL = 5 * 60 * 1000 // cache secrets for 5 minutes

async function getSecret(name: string): Promise<string> {
  const cached = cache.get(name)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
    const ssm = new SSMClient({ region: process.env.DYNAMO_REGION ?? 'us-east-1' })
    const res = await ssm.send(new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }))
    const value = res.Parameter?.Value ?? ''
    cache.set(name, { value, expiresAt: Date.now() + TTL })
    return value
  } catch (err) {
    console.error(`Failed to fetch secret ${name}:`, err)
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

export async function getAnthropicApiKey(): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  return getSecret('/egs/ANTHROPIC_API_KEY')
}

export async function getMatchingQueueUrl(): Promise<string> {
  if (process.env.MATCHING_QUEUE_URL) return process.env.MATCHING_QUEUE_URL
  return getSecret('/egs/MATCHING_QUEUE_URL')
}

export async function getResendApiKey(): Promise<string> {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY
  return getSecret('/egs/RESEND_API_KEY')
}
