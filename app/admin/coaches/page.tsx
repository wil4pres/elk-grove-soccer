import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import Link from 'next/link'
import { CoachForm } from './_components/coach-form'

export const dynamic = 'force-dynamic'

type ManualCoach = {
  id: string
  first_name: string
  last_name: string
  age_group: string
  email: string
  mobile_number: string
  practice_field: string
}

type Field = {
  id: string
  name: string
  complex: string
}

type Props = { searchParams: Promise<{ edit?: string; add?: string }> }

const SUBDIVISIONS = [
  { value: 'Q1', label: 'Quarter 1' },
  { value: 'Q2', label: 'Quarter 2' },
  { value: 'Q3', label: 'Quarter 3' },
  { value: 'Q4', label: 'Quarter 4' },
  { value: 'H1', label: 'Half 1' },
  { value: 'H2', label: 'Half 2' },
]

export function practiceFieldLabel(fieldId: string, subdivision: string, fields: Field[]): string {
  const field = fields.find(f => f.id === fieldId)
  if (!field) return `${fieldId} — ${subdivision}`
  const sub = SUBDIVISIONS.find(s => s.value === subdivision)
  return `${field.complex} — ${field.name} — ${sub?.label ?? subdivision}`
}

export function parsePracticeField(stored: string): { fieldId: string; subdivision: string } {
  const [fieldId, subdivision] = stored.split('|')
  return { fieldId: fieldId ?? '', subdivision: subdivision ?? '' }
}

export default async function CoachesPage({ searchParams }: Props) {
  const { edit, add } = await searchParams

  const [coachesRes, fieldsRes] = await Promise.all([
    db.send(new ScanCommand({
      TableName: 'egs-coaches',
      FilterExpression: 'season = :s AND begins_with(id, :prefix)',
      ExpressionAttributeValues: { ':s': '2026', ':prefix': 'manual-' },
    })),
    db.send(new ScanCommand({ TableName: 'egs-fields' })),
  ])

  const coaches = ((coachesRes.Items ?? []) as ManualCoach[]).sort((a, b) =>
    `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)
  )

  const fields = ((fieldsRes.Items ?? []) as Field[])
    .filter(f => f.id && f.name)
    .sort((a, b) => a.complex?.localeCompare(b.complex ?? '') || a.name.localeCompare(b.name))

  const editingCoach = edit ? coaches.find(c => c.id === edit) : null
  const showForm = !!add || !!editingCoach

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaches</h1>
          <p className="text-gray-500 text-sm mt-0.5">{coaches.length} manually added · Spring 2026</p>
        </div>
        {!showForm && (
          <Link
            href="/admin/coaches?add=1"
            className="bg-[#0080ff] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#0070e0] transition-colors"
          >
            + Add Coach
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editingCoach ? 'Edit Coach' : 'Add Coach'}
          </h2>
          <CoachForm editingCoach={editingCoach ?? null} fields={fields} />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {coaches.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No coaches added yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {coaches.map(coach => {
              const { fieldId, subdivision } = parsePracticeField(coach.practice_field ?? '')
              const fieldLabel = fieldId
                ? practiceFieldLabel(fieldId, subdivision, fields)
                : '—'

              return (
                <div key={coach.id} className={`p-4 ${edit === coach.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900">
                          {coach.first_name} {coach.last_name}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {coach.age_group}
                        </span>
                      </div>
                      {coach.email && (
                        <p className="text-sm text-gray-500">{coach.email}</p>
                      )}
                      {coach.mobile_number && (
                        <p className="text-sm text-gray-500">{coach.mobile_number}</p>
                      )}
                      {fieldLabel !== '—' && (
                        <p className="text-sm text-gray-600 mt-1">
                          📍 <span className="font-medium">{fieldLabel}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 text-sm shrink-0">
                      <Link
                        href={`/admin/coaches?edit=${coach.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </Link>
                      <DeleteButton coachId={coach.id} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Inline delete button — client island
function DeleteButton({ coachId }: { coachId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        const { db: dynamo } = await import('@/lib/dynamo')
        const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb')
        await dynamo.send(new DeleteCommand({ TableName: 'egs-coaches', Key: { id: coachId } }))
        const { redirect } = await import('next/navigation')
        redirect('/admin/coaches')
      }}
    >
      <button
        type="submit"
        className="text-red-500 hover:text-red-700 font-medium"
        onClick={e => {
          if (!confirm('Delete this coach?')) e.preventDefault()
        }}
      >
        Delete
      </button>
    </form>
  )
}
