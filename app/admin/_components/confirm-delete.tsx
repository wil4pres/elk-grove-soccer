'use client'
import { useTransition } from 'react'

export function ConfirmDelete({ action, label = 'Delete' }: { action: () => Promise<void>; label?: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm('Delete this item? This cannot be undone.')) {
          startTransition(() => action())
        }
      }}
      className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-40 transition-colors"
    >
      {pending ? 'Deleting…' : label}
    </button>
  )
}
