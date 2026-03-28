import { redirect } from 'next/navigation'
import { AuthService } from '@/lib/auth/service'

export async function GET() {
  try {
    await AuthService.logout()
  } catch (error) {
    console.error('Logout error:', error)
  }

  redirect('/admin/login')
}
