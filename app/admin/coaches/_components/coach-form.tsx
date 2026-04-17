'use client'
import { useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/app/admin/_utils/admin-fetch'

type Field = { id: string; name: string; complex: string }

type EditingCoach = {
  id: string
  first_name: string
  last_name: string
  age_group: string
  email: string
  mobile_number: string
  practice_field: string
} | null

const AGE_GROUPS = [
  'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12',
  'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20',
]

const SUBDIVISIONS = [
  { value: 'Q1', label: 'Quarter 1' },
  { value: 'Q2', label: 'Quarter 2' },
  { value: 'Q3', label: 'Quarter 3' },
  { value: 'Q4', label: 'Quarter 4' },
  { value: 'H1', label: 'Half 1' },
  { value: 'H2', label: 'Half 2' },
]

function parsePracticeField(stored: string): { fieldId: string; subdivision: string } {
  const [fieldId, subdivision] = (stored ?? '').split('|')
  return { fieldId: fieldId ?? '', subdivision: subdivision ?? '' }
}

export function CoachForm({ editingCoach, fields }: { editingCoach: EditingCoach; fields: Field[] }) {
  const initial = parsePracticeField(editingCoach?.practice_field ?? '')

  const [firstName, setFirstName] = useState(editingCoach?.first_name ?? '')
  const [lastName, setLastName] = useState(editingCoach?.last_name ?? '')
  const [ageGroup, setAgeGroup] = useState(editingCoach?.age_group ?? '')
  const [email, setEmail] = useState(editingCoach?.email ?? '')
  const [phone, setPhone] = useState(editingCoach?.mobile_number ?? '')
  const [selectedFieldId, setSelectedFieldId] = useState(initial.fieldId)
  const [selectedSubdivision, setSelectedSubdivision] = useState(initial.subdivision)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const practiceField = selectedFieldId && selectedSubdivision
    ? `${selectedFieldId}|${selectedSubdivision}`
    : ''

  // Group fields by complex for <optgroup>
  const complexGroups = fields.reduce<Record<string, Field[]>>((acc, f) => {
    const key = f.complex || 'Other'
    ;(acc[key] ??= []).push(f)
    return acc
  }, {})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await adminFetch('/api/admin/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCoach?.id,
          first_name: firstName,
          last_name: lastName,
          age_group: ageGroup,
          email,
          phone,
          practice_field: practiceField,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      window.location.href = '/admin/coaches'
    } catch {
      setError('Failed to save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {error && (
        <p className="sm:col-span-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          {error}
        </p>
      )}

      {/* Row 1: First + Last Name */}
      <div>
        <label className="label">First Name</label>
        <input
          required
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="input"
          placeholder="Maria"
        />
      </div>
      <div>
        <label className="label">Last Name</label>
        <input
          required
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          className="input"
          placeholder="Torres"
        />
      </div>

      {/* Row 2: Age Group */}
      <div>
        <label className="label">Age Group</label>
        <select
          required
          value={ageGroup}
          onChange={e => setAgeGroup(e.target.value)}
          className="input"
        >
          <option value="">— select age group —</option>
          {AGE_GROUPS.map(ag => (
            <option key={ag} value={ag}>{ag}</option>
          ))}
        </select>
      </div>

      {/* Row 3: Email + Phone */}
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input"
          placeholder="coach@example.com"
        />
      </div>
      <div>
        <label className="label">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="input"
          placeholder="(916) 555-0100"
        />
      </div>

      {/* Row 4: Practice Field — two-step: pick field, then pick subdivision */}
      <div>
        <label className="label">Practice Field</label>
        <select
          value={selectedFieldId}
          onChange={e => { setSelectedFieldId(e.target.value); setSelectedSubdivision('') }}
          className="input"
        >
          <option value="">— select field —</option>
          {Object.entries(complexGroups).map(([complex, groupFields]) => (
            <optgroup key={complex} label={complex}>
              {groupFields.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Field Section</label>
        <select
          value={selectedSubdivision}
          onChange={e => setSelectedSubdivision(e.target.value)}
          className="input"
          disabled={!selectedFieldId}
        >
          <option value="">— select section —</option>
          <optgroup label="Quarters (4 teams)">
            {SUBDIVISIONS.filter(s => s.value.startsWith('Q')).map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </optgroup>
          <optgroup label="Halves (2 teams)">
            {SUBDIVISIONS.filter(s => s.value.startsWith('H')).map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </optgroup>
        </select>
        {selectedFieldId && !selectedSubdivision && (
          <p className="text-xs text-amber-600 mt-1">Select a section to complete the field assignment.</p>
        )}
      </div>

      {/* Summary */}
      {practiceField && (
        <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-800">
          📍 Practice assignment: <span className="font-semibold">
            {complexGroups[fields.find(f => f.id === selectedFieldId)?.complex ?? '']?.find(f => f.id === selectedFieldId)?.name ?? selectedFieldId}
            {' — '}
            {SUBDIVISIONS.find(s => s.value === selectedSubdivision)?.label}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="sm:col-span-2 flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : editingCoach ? 'Save Changes' : 'Add Coach'}
        </button>
        <Link href="/admin/coaches" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  )
}
