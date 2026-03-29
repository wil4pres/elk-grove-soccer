'use client'
import { useState } from 'react'
import Link from 'next/link'

const KNOWN_COMPLEXES: Record<string, { address: string; parking: string; amenities: string }> = {
  'Cherry Island Complex': {
    address: '6300 Bilby Rd, Elk Grove, CA 95758',
    parking: 'Lots A and B — enter from Bilby Rd. Arrive 20 min early.',
    amenities: 'Restrooms near concession stand (Fields 2–3). Concession stand open game days.',
  },
  'Laguna Park Complex': {
    address: '9830 Waterman Rd, Elk Grove, CA 95624',
    parking: 'Lot D — main entrance off Waterman Rd. Overflow gravel lot east of entrance.',
    amenities: 'Water fountain near main pavilion. Portable restrooms on game days.',
  },
}

type EditingField = {
  id: string; name: string; complex: string; address: string
  parkingInfo: string; amenities: string; status: string; notes: string; updatedBy: string
} | null

export function FieldForm({ editingField }: { editingField: EditingField }) {
  const [complex, setComplex] = useState(editingField?.complex ?? '')
  const [address, setAddress] = useState(editingField?.address ?? '')
  const [parking, setParking] = useState(editingField?.parkingInfo ?? '')
  const [amenities, setAmenities] = useState(editingField?.amenities ?? '')
  const [name, setName] = useState(editingField?.name ?? '')
  const [status, setStatus] = useState(editingField?.status ?? 'open')
  const [notes, setNotes] = useState(editingField?.notes ?? '')
  const [updatedBy, setUpdatedBy] = useState(editingField?.updatedBy ?? '')
  const [fieldId, setFieldId] = useState(editingField?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleComplexChange(val: string) {
    setComplex(val)
    const known = KNOWN_COMPLEXES[val]
    if (known && !editingField) {
      setAddress(known.address)
      setParking(known.parking)
      setAmenities(known.amenities)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/fields/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: fieldId, name, complex, address, parkingInfo: parking, amenities, status, notes, updatedBy }),
      })
      if (!res.ok) throw new Error('Save failed')
      window.location.href = '/admin/fields'
    } catch {
      setError('Failed to save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {error && <p className="sm:col-span-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

      {/* Row 1: Field ID + Field Name */}
      <div>
        <label className="label">Field ID {!editingField && <span className="text-gray-400">(e.g. ci-f3)</span>}</label>
        <input
          required
          value={fieldId}
          onChange={e => setFieldId(e.target.value)}
          readOnly={!!editingField}
          className={`input ${editingField ? 'bg-gray-50 text-gray-400' : ''}`}
          placeholder="ci-f3"
        />
        <p className="text-xs text-gray-400 mt-1">Use prefix: ci- (Cherry Island), lp- (Laguna Park)</p>
      </div>
      <div>
        <label className="label">Field Name</label>
        <input required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Field 3" />
      </div>

      {/* Row 2: Complex + Status */}
      <div>
        <label className="label">Complex</label>
        <select required value={complex} onChange={e => handleComplexChange(e.target.value)} className="input">
          <option value="">— select complex —</option>
          {Object.keys(KNOWN_COMPLEXES).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="__custom">Other (custom)</option>
        </select>
        {complex === '__custom' && (
          <input required className="input mt-2" placeholder="Complex name" onChange={e => setComplex(e.target.value)} />
        )}
      </div>
      <div>
        <label className="label">Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input">
          <option value="open">Open</option>
          <option value="delay">Delay</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Row 3: Address */}
      <div className="sm:col-span-2">
        <label className="label">Complex Address <span className="text-gray-400 font-normal">(used for Google Maps embed + directions)</span></label>
        <input value={address} onChange={e => setAddress(e.target.value)} className="input" placeholder="6300 Bilby Rd, Elk Grove, CA 95758" />
        {address && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            ↗ Preview on Google Maps
          </a>
        )}
      </div>

      {/* Row 4: Parking + Amenities */}
      <div>
        <label className="label">Parking Info</label>
        <textarea rows={3} value={parking} onChange={e => setParking(e.target.value)} className="input resize-none" placeholder="Lots A and B — enter from Bilby Rd. Arrive 20 min early." />
      </div>
      <div>
        <label className="label">Amenities</label>
        <textarea rows={3} value={amenities} onChange={e => setAmenities(e.target.value)} className="input resize-none" placeholder="Restrooms, concession stand, water fountain..." />
      </div>

      {/* Row 5: Notes + Updated By */}
      <div>
        <label className="label">Game Day Notes</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Surface clear. Trainers on site." />
      </div>
      <div>
        <label className="label">Updated By</label>
        <input value={updatedBy} onChange={e => setUpdatedBy(e.target.value)} className="input" placeholder="Coach Reyes" />
      </div>

      {/* Actions */}
      <div className="sm:col-span-2 flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : editingField ? 'Save Changes' : 'Add Field'}
        </button>
        <Link href="/admin/fields" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  )
}
