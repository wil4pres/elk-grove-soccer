'use client'
import { useEffect } from 'react'

export default function MatchingReportPage() {
  // Hide the admin nav padding so the iframe can fill the viewport
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 top-14 w-full">
      <iframe
        src="/api/admin/matching-report"
        className="w-full h-full border-0"
        title="Team Matching Report"
      />
    </div>
  )
}
