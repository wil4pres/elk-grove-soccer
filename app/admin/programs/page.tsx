import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import Link from 'next/link'
import { saveProgram, deleteProgram } from './actions'
import { ConfirmDelete } from '../_components/confirm-delete'

export const dynamic = 'force-dynamic'

type Program = {
  id: string; name: string; level: string; ageBand: string; season: string
  price: number; capacity: number; enrolled: number; registrationStatus: string
  opensDate?: string; description: string; highlights: string[]
  commitment: string; whoIsItFor: string
}

type Props = { searchParams: Promise<{ edit?: string; add?: string }> }

const LEVEL_ORDER: Record<string, number> = {
  'future-stars': 0, 'recreational': 1, 'select': 2, 'academy': 3, 'camps': 4,
}

const statusBadge: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  'opens-soon': 'bg-yellow-100 text-yellow-700',
  waitlist: 'bg-orange-100 text-orange-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default async function ProgramsPage({ searchParams }: Props) {
  const { edit, add } = await searchParams
  const res = await db.send(new ScanCommand({ TableName: 'egs-programs' }))
  const programs = (res.Items ?? []) as Program[]
  programs.sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9))

  const editingItem = edit ? programs.find(p => p.id === edit) : null
  const showForm = !!add || !!editingItem

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{programs.length} programs</p>
        </div>
        {!showForm && (
          <Link href="/admin/programs?add=1" className="bg-[#0080ff] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#0070e0] transition-colors">
            + Add Program
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingItem ? `Edit: ${editingItem.name}` : 'Add Program'}</h2>
          <form action={saveProgram} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Program ID {!editingItem && <span className="text-gray-400">(slug, e.g. select-12u)</span>}</label>
              <input name="id" required defaultValue={editingItem?.id ?? ''} readOnly={!!editingItem}
                className={`input ${editingItem ? 'bg-gray-50 text-gray-400' : ''}`} />
            </div>
            <div>
              <label className="label">Name</label>
              <input name="name" required defaultValue={editingItem?.name ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Level</label>
              <select name="level" defaultValue={editingItem?.level ?? 'recreational'} className="input">
                <option value="future-stars">Future Stars</option>
                <option value="recreational">Recreational</option>
                <option value="select">Select</option>
                <option value="academy">Academy</option>
                <option value="camps">Camps & Clinics</option>
              </select>
            </div>
            <div>
              <label className="label">Age Band</label>
              <input name="ageBand" required defaultValue={editingItem?.ageBand ?? ''} className="input" placeholder="Ages 7–12 (U8–U12)" />
            </div>
            <div>
              <label className="label">Season</label>
              <input name="season" required defaultValue={editingItem?.season ?? ''} className="input" placeholder="Spring 2026" />
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input name="price" type="number" required defaultValue={editingItem?.price ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input name="capacity" type="number" required defaultValue={editingItem?.capacity ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Enrolled</label>
              <input name="enrolled" type="number" required defaultValue={editingItem?.enrolled ?? 0} className="input" />
            </div>
            <div>
              <label className="label">Registration Status</label>
              <select name="registrationStatus" defaultValue={editingItem?.registrationStatus ?? 'open'} className="input">
                <option value="open">Open</option>
                <option value="opens-soon">Opens Soon</option>
                <option value="waitlist">Waitlist</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="label">Opens Date <span className="text-gray-400">(if opens-soon)</span></label>
              <input name="opensDate" defaultValue={editingItem?.opensDate ?? ''} className="input" placeholder="April 15, 2026" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea name="description" required defaultValue={editingItem?.description ?? ''} rows={2} className="input resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Highlights <span className="text-gray-400">(one per line)</span></label>
              <textarea name="highlights" required defaultValue={editingItem?.highlights?.join('\n') ?? ''} rows={4} className="input resize-none" />
            </div>
            <div>
              <label className="label">Commitment</label>
              <input name="commitment" required defaultValue={editingItem?.commitment ?? ''} className="input" placeholder="Low — weekends only" />
            </div>
            <div>
              <label className="label">Who Is It For</label>
              <input name="whoIsItFor" required defaultValue={editingItem?.whoIsItFor ?? ''} className="input" />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{editingItem ? 'Save Changes' : 'Add Program'}</button>
              <Link href="/admin/programs" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {programs.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No programs yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {programs.map(p => (
              <div key={p.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${edit === p.id ? 'bg-blue-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-gray-900">{p.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge[p.registrationStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {p.registrationStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{p.ageBand} · {p.season} · ${p.price}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.enrolled}/{p.capacity} enrolled</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href={`/admin/programs?edit=${p.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</Link>
                  <ConfirmDelete action={deleteProgram.bind(null, p.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
