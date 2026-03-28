'use server'
import { redirect } from 'next/navigation'
import { AuthService } from '@/lib/auth/service'

export async function login(formData: FormData) {
  const password = formData.get('password') as string

  if (!password) {
    redirect('/admin/login?error=1')
  }

  const result = await AuthService.login(password)

  if (!result.success) {
    console.warn('Login attempt failed:', result.error)
    redirect('/admin/login?error=1')
  }

  redirect('/admin')
}
