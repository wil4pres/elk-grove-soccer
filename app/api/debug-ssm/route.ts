import { getAdminPassword, getSessionSecret } from '@/lib/secrets'

export async function GET() {
  const pw = await getAdminPassword()
  const ss = await getSessionSecret()
  return Response.json({
    passwordLength: pw.length,
    passwordFirst2: pw.slice(0, 2),
    passwordLast2: pw.slice(-2),
    secretLength: ss.length,
    hasEnvPassword: !!process.env.ADMIN_PASSWORD,
    hasEnvSecret: !!process.env.SESSION_SECRET,
    envDynamoRegion: process.env.DYNAMO_REGION ?? 'not set',
  })
}
