import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isSessionValid } from '@/lib/auth/session'

export async function GET(req: NextRequest) {
  // Verify admin session cookie
  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await isSessionValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const html = readFileSync(join(process.cwd(), 'matching', 'report.html'), 'utf-8')
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;padding:2rem"><h2>Report not found</h2><p>Run <code>npx tsx matching/generate-report.ts</code> to generate it.</p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}
