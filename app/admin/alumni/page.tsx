import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import Link from 'next/link'
import { saveAlumni, deleteAlumni } from './actions'
import { ConfirmDelete } from '../_components/confirm-delete'

export const dynamic = 'force-dynamic'

type Milestone = { year: number; achievement: string }
type Alumni = {
  id: string; name: string; gradYear: number; currentRole: string
  currentOrg: string; quote: string; milestones: Milestone[]
}

type Props = { searchParams: Promise<{ edit?: string; add?: string }> }

export default async function AlumniPage({ searchParams }: Props) {
  const { edit, add } = await searchParams
  const res = await db.send(new ScanCommand({ TableName: 'egs-alumni' }))
  const alumni = (res.Items ?? []) as Alumni[]
  alumni.sort((a, b) => b.gradYear - a.gradYear)

  const editingItem = edit ? alumni.find(a => a.id === edit) : null
  const showForm = !!add || !!editingItem

  const serializeMilestones = (m: Milestone[]) =>
    m.map(x => `${x.year}: ${x.achievement}`).join('\n')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumni</h1>
          <p className="text-gray-500 text-sm mt-0.5">{alumni.length} stories</p>
        </div>
        {!showForm && (
          <Link href="/admin/alumni?add=1" className="bg-[#0080ff] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#0070e0] transition-colors">
            + Add Alumni
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingItem ? `Edit: ${editingItem.name}` : 'Add Alumni'}</h2>
          <form action={saveAlumni} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Alumni ID {!editingItem && <span className="text-gray-400">(slug)</span>}</label>
              <input name="id" required defaultValue={editingItem?.id ?? ''} readOnly={!!editingItem}
                className={`input ${editingItem ? 'bg-gray-50 text-gray-400' : ''}`} placeholder="mia-santos" />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input name="name" required defaultValue={editingItem?.name ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Grad Year</label>
              <input name="gradYear" type="number" required defaultValue={editingItem?.gradYear ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Current Role</label>
              <input name="currentRole" required defaultValue={editingItem?.currentRole ?? ''} className="input" placeholder="Midfielder" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Current Organization</label>
              <input name="currentOrg" required defaultValue={editingItem?.currentOrg ?? ''} className="input" placeholder="Bay FC" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Quote</label>
              <textarea name="quote" required defaultValue={editingItem?.quote ?? ''} rows={2} className="input resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Milestones <span className="text-gray-400">(one per line: YEAR: Achievement text)</span></label>
              <textarea name="milestones" required defaultValue={editingItem ? serializeMilestones(editingItem.milestones) : ''} rows={5}
                className="input resize-none font-mono text-xs" placeholder="2016: Academy captain · NorCal Champions" />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{editingItem ? 'Save Changes' : 'Add Alumni'}</button>
              <Link href="/admin/alumni" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {alumni.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No alumni stories yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {alumni.map(a => (
              <div key={a.id} className={`p-4 flex items-center gap-4 ${edit === a.id ? 'bg-blue-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{a.name}</p>
                  <p className="text-sm text-gray-500">{a.currentRole} · {a.currentOrg} · Class of {a.gradYear}</p>
                  <p className="text-sm text-gray-400 italic truncate mt-0.5">&ldquo;{a.quote}&rdquo;</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href={`/admin/alumni?edit=${a.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</Link>
                  <ConfirmDelete action={deleteAlumni.bind(null, a.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
