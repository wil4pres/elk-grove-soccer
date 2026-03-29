import { NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/service'

export async function POST() {
  try {
    await AuthService.logout()
  } catch (error) {
    console.error('Logout error:', error)
  }

  return NextResponse.redirect(new URL('/admin/login', 'https://sacramento.soccer'))
}
