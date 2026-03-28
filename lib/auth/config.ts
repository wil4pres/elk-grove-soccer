import { AuthConfig, SessionCookieOptions } from './types'

export const authConfig: AuthConfig = {
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  sessionDuration: '24h',
  cookieName: 'admin_session',
  secureCookie: process.env.NODE_ENV === 'production'
}

export const sessionCookieOptions: SessionCookieOptions = {
  httpOnly: true,
  secure: authConfig.secureCookie,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours in seconds
  sameSite: 'lax'
}

export const protectedRoutes = {
  adminPrefix: '/admin',
  publicRoutes: ['/admin/login', '/admin/logout'],
  redirectUrl: '/admin/login'
}