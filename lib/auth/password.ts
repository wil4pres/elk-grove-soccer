import { AuthResult } from './types'
import { getAdminPassword } from '@/lib/secrets'

export async function validatePassword(password: string): Promise<AuthResult> {
  if (!password) {
    return { success: false, error: 'Password is required' }
  }

  const adminPassword = await getAdminPassword()

  if (!adminPassword) {
    console.error('Admin password not configured in SSM or environment')
    return { success: false, error: 'Authentication not configured' }
  }

  if (password !== adminPassword) {
    console.warn('Invalid login attempt')
    return { success: false, error: 'Invalid password' }
  }

  return { success: true, token: '' }
}

export async function isPasswordConfigured(): Promise<boolean> {
  const adminPassword = await getAdminPassword()
  return Boolean(adminPassword)
}