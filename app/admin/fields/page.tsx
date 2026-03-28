import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import Link from 'next/link'
import { saveField, deleteField, updateFieldStatus } from './actions'
import { ConfirmDelete } from '../_components/confirm-delete'
import { StatusButtons } from '../_components/status-buttons'

export const dynamic = 'force-dynamic'

type Field = {
  id: string; name: string; complex: string; status: 'open' | 'delay' | 'closed'
  notes: string; updatedAt: string; updatedBy: string
}

type Props = { searchParams: Promise<{ edit?: string; add?: string }> }

const statusBadge: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  delay: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-700',
}

export default async function FieldsPage({ searchParams }: Props) {
  const { edit, add } = await searchParams
  const res = await db.send(new ScanCommand({ TableName: 'egs-fields' }))
  const fields = (res.Items ?? []) as Field[]
  fields.sort((a, b) => a.complex.localeCompare(b.complex) || a.name.localeCompare(b.name))

  const editingField = edit ? fields.find(f => f.id === edit) : null
  const showForm = !!add || !!editingField

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Status</h1>
          <p className="text-gray-500 text-sm mt-0.5">{fields.length} fields</p>
        </div>
        {!showForm && (
          <Link href="/admin/fields?add=1" className="bg-[#0080ff] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#0070e0] transition-colors">
            + Add Field
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingField ? 'Edit Field' : 'Add Field'}</h2>
          <form action={saveField} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="hidden" name="id" defaultValue={editingField?.id ?? ''} />
            <div>
              <label className="label">Field ID {!editingField && <span className="text-gray-400">(e.g. ci-f3)</span>}</label>
              <input name="id" required defaultValue={editingField?.id ?? ''} readOnly={!!editingField}
                className={`input ${editingField ? 'bg-gray-50 text-gray-400' : ''}`} placeholder="ci-f3" />
            </div>
            <div>
              <label className="label">Field Name</label>
              <input name="name" required defaultValue={editingField?.name ?? ''} className="input" placeholder="Field 3" />
            </div>
            <div>
              <label className="label">Complex</label>
              <input name="complex" required defaultValue={editingField?.complex ?? ''} className="input" placeholder="Cherry Island Complex" />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={editingField?.status ?? 'open'} className="input">
                <option value="open">Open</option>
                <option value="delay">Delay</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input name="notes" defaultValue={editingField?.notes ?? ''} className="input" placeholder="Surface clear. Trainers on site." />
            </div>
            <div>
              <label className="label">Updated By</label>
              <input name="updatedBy" defaultValue={editingField?.updatedBy ?? ''} className="input" placeholder="Coach Reyes" />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{editingField ? 'Save Changes' : 'Add Field'}</button>
              <Link href="/admin/fields" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {fields.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No fields yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {fields.map(field => (
              <div key={field.id} className={`p-4 ${edit === field.id ? 'bg-blue-50' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900">{field.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge[field.status]}`}>
                        {field.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{field.complex}</p>
                    {field.notes && <p className="text-sm text-gray-600 mt-1">{field.notes}</p>}
                    <p className="text-xs text-gray-400 mt-1">Updated {field.updatedAt} by {field.updatedBy}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <StatusButtons fieldId={field.id} current={field.status} updateAction={updateFieldStatus} />
                    <div className="flex gap-3 text-sm">
                      <Link href={`/admin/fields?edit=${field.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                      <ConfirmDelete action={deleteField.bind(null, field.id)} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
