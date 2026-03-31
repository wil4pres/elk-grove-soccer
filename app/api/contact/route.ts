import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY ?? ''
const TO_EMAIL = 'info@elkgrovesoccer.com'

async function verifyTurnstile(token: string, ip: string): Promise<{ success: boolean; errorCodes?: string[] }> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
      remoteip: ip,
    }),
  })
  const data = await res.json() as { success: boolean; 'error-codes'?: string[] }
  return { success: data.success === true, errorCodes: data['error-codes'] }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string
      email: string
      phone?: string
      topic: string
      message: string
      turnstileToken: string
      honeypot?: string
    }

    // Honeypot — bots fill this, humans don't
    if (body.honeypot) {
      return NextResponse.json({ ok: true }) // silently accept
    }

    const { name, email, phone, topic, message, turnstileToken } = body

    if (!name || !email || !topic || !message || !turnstileToken) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? '0.0.0.0'
    const { success, errorCodes } = await verifyTurnstile(turnstileToken, ip)
    if (!success) {
      return NextResponse.json({ error: `Security check failed: ${(errorCodes ?? []).join(', ')}` }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Elk Grove Soccer Contact <contact@sacramento.soccer>',
      to: TO_EMAIL,
      replyTo: email,
      subject: `[Contact] ${topic} — ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #080d1a; margin-bottom: 4px;">New contact form submission</h2>
          <p style="color: #666; font-size: 14px; margin-top: 0;">Submitted via sacramento.soccer/contact</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 100px; vertical-align: top;"><strong>Name</strong></td>
              <td style="padding: 8px 0; color: #111;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Email</strong></td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0080ff;">${email}</a></td>
            </tr>
            ${phone ? `<tr>
              <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Phone</strong></td>
              <td style="padding: 8px 0; color: #111;">${phone}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Topic</strong></td>
              <td style="padding: 8px 0; color: #111;">${topic}</td>
            </tr>
          </table>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

          <p style="color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Message</p>
          <p style="color: #111; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Reply directly to this email to respond to ${name}.</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
  }
}
