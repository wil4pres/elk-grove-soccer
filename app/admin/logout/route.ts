import { NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/service'

// GET must return 405 — Next.js RSC prefetches all Link hrefs via GET.
// If we handled GET here it would log the user out on every page load.
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST() {
  try {
    await AuthService.logout()
  } catch (error) {
    console.error('Logout error:', error)
  }

  return NextResponse.redirect(new URL('/admin/login', 'https://sacramento.soccer'))
}
