'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken } from '@/lib/session'

export async function login(formData: FormData) {
  const password = formData.get('password') as string
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    redirect('/admin/login?error=1')
  }
  const token = await createSessionToken()
  const cookieStore = await cookies()
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  })
  redirect('/admin')
}
