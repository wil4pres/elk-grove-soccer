import { NextRequest, NextResponse } from 'next/server'

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory sliding window. Works on Amplify's persistent Node server.
// Not shared across multiple instances, but effective against single-IP floods.

interface RateEntry { count: number; windowStart: number }
const rateLimitStore = new Map<string, RateEntry>()

// Periodically clean up stale entries so the Map doesn't grow forever
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > 15 * 60 * 1000) rateLimitStore.delete(key)
  }
}, 5 * 60 * 1000)

interface RuleConfig { maxRequests: number; windowMs: number }

const RATE_RULES: Array<{ match: (pathname: string, method: string) => boolean } & RuleConfig> = [
  // Login brute-force: 5 attempts per 15 min
  {
    match: (p) => p === '/api/admin/login',
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  // Health endpoint leaks env info: 10 per min
  {
    match: (p) => p === '/api/health',
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  // Write operations: 30 per min
  {
    match: (p, m) => p.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(m),
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  // All other API reads: 100 per min
  {
    match: (p) => p.startsWith('/api/'),
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
]

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function checkRateLimit(_ip: string, rule: RuleConfig & { match: unknown }, key: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now - entry.windowStart >= rule.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now })
    return true // allowed
  }

  if (entry.count >= rule.maxRequests) return false // blocked

  entry.count++
  return true // allowed
}

function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(retryAfterSec),
      },
    }
  )
}

// ── Admin auth ────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'admin_session'
const PUBLIC_ROUTES = ['/admin/login']

async function verifyToken(token: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.admin) return false
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false

    const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
    const keyData = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const sigBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )
    return await crypto.subtle.verify('HMAC', key, sigBytes, sigInput)
  } catch {
    return false
  }
}

// ── Middleware entry ──────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // Rate limit all API routes
  if (pathname.startsWith('/api/')) {
    const ip = getIP(req)
    const rule = RATE_RULES.find((r) => r.match(pathname, method))
    if (rule) {
      const key = `${ip}:${pathname}:${method}`
      const allowed = checkRateLimit(ip, rule, key)
      if (!allowed) {
        const retryAfterSec = Math.ceil(rule.windowMs / 1000)
        return tooManyRequests(retryAfterSec)
      }
    }
    return NextResponse.next()
  }

  // Admin auth
  if (!pathname.startsWith('/admin') || PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.redirect(new URL('/admin/login', req.url))

  const valid = await verifyToken(token)
  if (!valid) return NextResponse.redirect(new URL('/admin/login', req.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
