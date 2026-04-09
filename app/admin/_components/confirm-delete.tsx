'use client'
import { useTransition } from 'react'
import { adminFetch } from '@/app/admin/_utils/admin-fetch'

interface Props {
  /** Server action to call (used when apiUrl is not provided) */
  action?: () => Promise<void>
  /** API route to POST to instead of a server action */
  apiUrl?: string
  /** JSON body for the API route */
  apiBody?: Record<string, unknown>
  label?: string
}

export function ConfirmDelete({ action, apiUrl, apiBody, label = 'Delete' }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Delete this item? This cannot be undone.')) return

    if (apiUrl) {
      adminFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody ?? {}),
      }).then(() => {
        window.location.reload()
      })
      return
    }

    if (action) {
      startTransition(() => action())
    }
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40 transition-colors"
    >
      {pending ? 'Deleting…' : label}
    </button>
  )
}
