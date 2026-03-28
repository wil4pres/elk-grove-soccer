import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import Link from 'next/link'
import { saveStaff, deleteStaff } from './actions'
import { ConfirmDelete } from '../_components/confirm-delete'

export const dynamic = 'force-dynamic'

type Staff = {
  id: string; name: string; role: string; bio: string
  email?: string; phone?: string; sortOrder?: number
}

type Props = { searchParams: Promise<{ edit?: string; add?: string }> }

export default async function StaffPage({ searchParams }: Props) {
  const { edit, add } = await searchParams
  const res = await db.send(new ScanCommand({ TableName: 'egs-staff' }))
  const staff = (res.Items ?? []) as Staff[]
  staff.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))

  const editingItem = edit ? staff.find(s => s.id === edit) : null
  const showForm = !!add || !!editingItem

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaching Staff</h1>
          <p className="text-gray-500 text-sm mt-0.5">{staff.length} staff members</p>
        </div>
        {!showForm && (
          <Link href="/admin/staff?add=1" className="bg-[#0080ff] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#0070e0] transition-colors">
            + Add Staff
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingItem ? `Edit: ${editingItem.name}` : 'Add Staff Member'}</h2>
          <form action={saveStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Staff ID {!editingItem && <span className="text-gray-400">(slug)</span>}</label>
              <input name="id" required defaultValue={editingItem?.id ?? ''} readOnly={!!editingItem}
                className={`input ${editingItem ? 'bg-gray-50 text-gray-400' : ''}`} placeholder="coach-reyes" />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input name="name" required defaultValue={editingItem?.name ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Role / Title</label>
              <input name="role" required defaultValue={editingItem?.role ?? ''} className="input" placeholder="Head Coach, Academy" />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input name="sortOrder" type="number" defaultValue={editingItem?.sortOrder ?? 99} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Bio</label>
              <textarea name="bio" required defaultValue={editingItem?.bio ?? ''} rows={3} className="input resize-none" />
            </div>
            <div>
              <label className="label">Email <span className="text-gray-400">(optional)</span></label>
              <input name="email" type="email" defaultValue={editingItem?.email ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Phone <span className="text-gray-400">(optional)</span></label>
              <input name="phone" defaultValue={editingItem?.phone ?? ''} className="input" placeholder="(916) 555-0100" />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{editingItem ? 'Save Changes' : 'Add Staff'}</button>
              <Link href="/admin/staff" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-3">No staff members yet.</p>
            <Link href="/admin/staff?add=1" className="text-blue-600 hover:underline text-sm font-medium">Add your first staff member →</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map(s => (
              <div key={s.id} className={`p-4 flex items-center gap-4 ${edit === s.id ? 'bg-blue-50' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <span className="font-bold text-xs text-gray-600">{s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.role}</p>
                  {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href={`/admin/staff?edit=${s.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</Link>
                  <ConfirmDelete action={deleteStaff.bind(null, s.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
