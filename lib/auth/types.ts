export interface SessionPayload {
  admin: boolean
  iat?: number
  exp?: number
  [key: string]: unknown
}

export interface AuthConfig {
  sessionSecret: string
  adminPassword: string
  sessionDuration: string
  cookieName: string
  secureCookie: boolean
}

export interface SessionCookieOptions {
  httpOnly: boolean
  secure: boolean
  path: string
  maxAge: number
  sameSite: 'strict' | 'lax' | 'none'
}

export type AuthResult =
  | { success: true; token: string }
  | { success: false; error: string }

export interface VerifyResult {
  valid: boolean
  payload?: SessionPayload
  error?: string
}