import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import Link from 'next/link'
import { saveSponsor, deleteSponsor } from './actions'
import { ConfirmDelete } from '../_components/confirm-delete'

export const dynamic = 'force-dynamic'

type Sponsor = {
  id: string; name: string; tier: string; tagline: string
  initials: string; ctaLabel: string; ctaHref: string
}

type Props = { searchParams: Promise<{ edit?: string; add?: string }> }

export default async function SponsorsPage({ searchParams }: Props) {
  const { edit, add } = await searchParams
  const res = await db.send(new ScanCommand({ TableName: 'egs-sponsors' }))
  const sponsors = (res.Items ?? []) as Sponsor[]
  sponsors.sort((a, b) => {
    if (a.tier === b.tier) return a.name.localeCompare(b.name)
    return a.tier === 'premier' ? -1 : 1
  })

  const editingItem = edit ? sponsors.find(s => s.id === edit) : null
  const showForm = !!add || !!editingItem

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsors</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sponsors.length} sponsors</p>
        </div>
        {!showForm && (
          <Link href="/admin/sponsors?add=1" className="bg-[#0080ff] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#0070e0] transition-colors">
            + Add Sponsor
          </Link>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editingItem ? `Edit: ${editingItem.name}` : 'Add Sponsor'}</h2>
          <form action={saveSponsor} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Sponsor ID {!editingItem && <span className="text-gray-400">(slug)</span>}</label>
              <input name="id" required defaultValue={editingItem?.id ?? ''} readOnly={!!editingItem}
                className={`input ${editingItem ? 'bg-gray-50 text-gray-400' : ''}`} placeholder="sentinel-health" />
            </div>
            <div>
              <label className="label">Name</label>
              <input name="name" required defaultValue={editingItem?.name ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Tier</label>
              <select name="tier" defaultValue={editingItem?.tier ?? 'community'} className="input">
                <option value="premier">Premier</option>
                <option value="community">Community</option>
              </select>
            </div>
            <div>
              <label className="label">Initials</label>
              <input name="initials" required maxLength={3} defaultValue={editingItem?.initials ?? ''} className="input" placeholder="SH" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Tagline</label>
              <input name="tagline" required defaultValue={editingItem?.tagline ?? ''} className="input" />
            </div>
            <div>
              <label className="label">CTA Label</label>
              <input name="ctaLabel" required defaultValue={editingItem?.ctaLabel ?? ''} className="input" placeholder="Visit website" />
            </div>
            <div>
              <label className="label">CTA Link</label>
              <input name="ctaHref" required defaultValue={editingItem?.ctaHref ?? ''} className="input" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{editingItem ? 'Save Changes' : 'Add Sponsor'}</button>
              <Link href="/admin/sponsors" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {sponsors.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No sponsors yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sponsors.map(s => (
              <div key={s.id} className={`p-4 flex items-center gap-4 ${edit === s.id ? 'bg-blue-50' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="font-bold text-xs text-gray-600">{s.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{s.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.tier === 'premier' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.tier}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{s.tagline}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href={`/admin/sponsors?edit=${s.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</Link>
                  <ConfirmDelete action={deleteSponsor.bind(null, s.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
