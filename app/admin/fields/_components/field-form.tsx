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

export function FieldForm({
  editingField,
  saveAction,
}: {
  editingField: EditingField
  saveAction: (formData: FormData) => Promise<void>
}) {
  const [complex, setComplex] = useState(editingField?.complex ?? '')
  const [address, setAddress] = useState(editingField?.address ?? '')
  const [parking, setParking] = useState(editingField?.parkingInfo ?? '')
  const [amenities, setAmenities] = useState(editingField?.amenities ?? '')

  function handleComplexChange(val: string) {
    setComplex(val)
    const known = KNOWN_COMPLEXES[val]
    if (known && !editingField) {
      setAddress(known.address)
      setParking(known.parking)
      setAmenities(known.amenities)
    }
  }

  return (
    <form action={saveAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <input type="hidden" name="id" defaultValue={editingField?.id ?? ''} />

      {/* Row 1: Field ID + Field Name */}
      <div>
        <label className="label">Field ID {!editingField && <span className="text-gray-400">(e.g. ci-f3)</span>}</label>
        <input
          name="id"
          required
          defaultValue={editingField?.id ?? ''}
          readOnly={!!editingField}
          className={`input ${editingField ? 'bg-gray-50 text-gray-400' : ''}`}
          placeholder="ci-f3"
        />
        <p className="text-xs text-gray-400 mt-1">Use prefix: ci- (Cherry Island), lp- (Laguna Park)</p>
      </div>
      <div>
        <label className="label">Field Name</label>
        <input name="name" required defaultValue={editingField?.name ?? ''} className="input" placeholder="Field 3" />
      </div>

      {/* Row 2: Complex + Status */}
      <div>
        <label className="label">Complex</label>
        <select
          name="complex"
          required
          value={complex}
          onChange={e => handleComplexChange(e.target.value)}
          className="input"
        >
          <option value="">— select complex —</option>
          {Object.keys(KNOWN_COMPLEXES).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="__custom">Other (custom)</option>
        </select>
        {complex === '__custom' && (
          <input
            name="complex"
            required
            className="input mt-2"
            placeholder="Complex name"
            onChange={e => setComplex(e.target.value)}
          />
        )}
      </div>
      <div>
        <label className="label">Status</label>
        <select name="status" defaultValue={editingField?.status ?? 'open'} className="input">
          <option value="open">Open</option>
          <option value="delay">Delay</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Row 3: Address (full width) */}
      <div className="sm:col-span-2">
        <label className="label">Complex Address <span className="text-gray-400 font-normal">(used for Google Maps embed + directions)</span></label>
        <input
          name="address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="input"
          placeholder="6300 Bilby Rd, Elk Grove, CA 95758"
        />
        {address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >
            ↗ Preview on Google Maps
          </a>
        )}
      </div>

      {/* Row 4: Parking + Amenities */}
      <div>
        <label className="label">Parking Info</label>
        <textarea
          name="parkingInfo"
          rows={3}
          value={parking}
          onChange={e => setParking(e.target.value)}
          className="input resize-none"
          placeholder="Lots A and B — enter from Bilby Rd. Arrive 20 min early."
        />
      </div>
      <div>
        <label className="label">Amenities</label>
        <textarea
          name="amenities"
          rows={3}
          value={amenities}
          onChange={e => setAmenities(e.target.value)}
          className="input resize-none"
          placeholder="Restrooms, concession stand, water fountain..."
        />
      </div>

      {/* Row 5: Notes + Updated By */}
      <div>
        <label className="label">Game Day Notes</label>
        <input name="notes" defaultValue={editingField?.notes ?? ''} className="input" placeholder="Surface clear. Trainers on site." />
      </div>
      <div>
        <label className="label">Updated By</label>
        <input name="updatedBy" defaultValue={editingField?.updatedBy ?? ''} className="input" placeholder="Coach Reyes" />
      </div>

      {/* Actions */}
      <div className="sm:col-span-2 flex gap-3 pt-2">
        <button type="submit" className="btn-primary">{editingField ? 'Save Changes' : 'Add Field'}</button>
        <Link href="/admin/fields" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  )
}
