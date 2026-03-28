import { cookies } from 'next/headers'
import { createSessionToken, verifySessionToken, refreshSessionTokenIfNeeded } from './session'
import { validatePassword } from './password'
import { authConfig, sessionCookieOptions } from './config'
import { AuthResult } from './types'

export class AuthService {
  static async login(password: string): Promise<AuthResult> {
    const passwordResult = await validatePassword(password)

    if (!passwordResult.success) {
      return passwordResult
    }

    try {
      const token = await createSessionToken()
      const cookieStore = await cookies()

      cookieStore.set(authConfig.cookieName, token, sessionCookieOptions)

      return { success: true, token }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: 'Login failed' }
    }
  }

  static async logout(): Promise<void> {
    try {
      const cookieStore = await cookies()
      cookieStore.delete(authConfig.cookieName)
    } catch (error) {
      console.error('Logout failed:', error)
      throw new Error('Logout failed')
    }
  }

  static async verifySession(token?: string): Promise<boolean> {
    if (!token) {
      try {
        const cookieStore = await cookies()
        token = cookieStore.get(authConfig.cookieName)?.value
      } catch {
        return false
      }
    }

    if (!token) {
      return false
    }

    const result = await verifySessionToken(token)
    return result.valid
  }

  static async refreshSessionIfNeeded(token: string): Promise<void> {
    try {
      const newToken = await refreshSessionTokenIfNeeded(token)

      if (newToken) {
        const cookieStore = await cookies()
        cookieStore.set(authConfig.cookieName, newToken, sessionCookieOptions)
      }
    } catch (error) {
      console.error('Session refresh failed:', error)
    }
  }

  static async getCurrentSession() {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get(authConfig.cookieName)?.value

      if (!token) {
        return null
      }

      const result = await verifySessionToken(token)

      return result.valid ? result.payload : null
    } catch {
      return null
    }
  }
}