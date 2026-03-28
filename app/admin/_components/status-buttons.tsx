'use client'
import { useTransition } from 'react'

type FieldStatus = 'open' | 'delay' | 'closed'

const config: Record<FieldStatus, string> = {
  open: 'bg-green-500 text-white',
  delay: 'bg-yellow-500 text-white',
  closed: 'bg-red-500 text-white',
}

export function StatusButtons({
  fieldId,
  current,
  updateAction,
}: {
  fieldId: string
  current: FieldStatus
  updateAction: (id: string, status: FieldStatus) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex gap-1.5">
      {(['open', 'delay', 'closed'] as FieldStatus[]).map(s => (
        <button
          key={s}
          disabled={pending || s === current}
          onClick={() => startTransition(() => updateAction(fieldId, s))}
          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
            s === current
              ? config[s]
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
