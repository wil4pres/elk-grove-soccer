import { authConfig } from './config'
import { AuthResult } from './types'

export async function validatePassword(password: string): Promise<AuthResult> {
  if (!password) {
    return { success: false, error: 'Password is required' }
  }

  if (!authConfig.adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set')
    return { success: false, error: 'Authentication not configured' }
  }

  if (password !== authConfig.adminPassword) {
    console.warn('Invalid login attempt')
    return { success: false, error: 'Invalid password' }
  }

  return { success: true, token: '' }
}

export function isPasswordConfigured(): boolean {
  return Boolean(authConfig.adminPassword)
}