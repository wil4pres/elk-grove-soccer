import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TABLE = 'egs-players'

async function getPlayers(season?: string) {
  const params = {
    TableName: TABLE,
    ...(season
      ? {
          FilterExpression: 'season = :s',
          ExpressionAttributeValues: { ':s': season },
        }
      : {}),
  }

  const all: Record<string, unknown>[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await db.send(new ScanCommand({ ...params, ExclusiveStartKey: lastKey }))
    all.push(...((res.Items as Record<string, unknown>[]) ?? []))
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return all.sort((a, b) =>
    String(a.player_last_name ?? '').localeCompare(String(b.player_last_name ?? ''))
  )
}

async function getSeasons(): Promise<string[]> {
  const res = await db.send(
    new ScanCommand({
      TableName: TABLE,
      ProjectionExpression: 'season',
    })
  )
  const seasons = new Set((res.Items ?? []).map(i => String(i.season)))
  return [...seasons].sort().reverse()
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; q?: string }>
}) {
  const { season, q } = await searchParams

  let players: Record<string, unknown>[] = []
  let seasons: string[] = []
  let error = ''

  try {
    ;[players, seasons] = await Promise.all([getPlayers(season), getSeasons()])
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load players'
  }

  const filtered = q
    ? players.filter(p => {
        const name = `${p.player_first_name} ${p.player_last_name}`.toLowerCase()
        const email = String(p.account_email ?? '').toLowerCase()
        const id = String(p.player_id ?? '')
        return name.includes(q.toLowerCase()) || email.includes(q.toLowerCase()) || id.includes(q)
      })
    : players

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {error ? '' : `${filtered.length} records`}
            {season ? ` — Season ${season}` : ' — All seasons'}
          </p>
        </div>
        <Link
          href="/admin/uploads"
          className="text-sm text-blue-600 hover:underline"
        >
          Upload CSV
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-4">
        <select
          name="season"
          defaultValue={season ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
        >
          <option value="">All Seasons</option>
          {seasons.map(s => (
            <option key={s} value={s}>
              Season {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search name, email, or ID..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white flex-1 min-w-48"
        />
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Filter
        </button>
        {(season || q) && (
          <Link
            href="/admin/players"
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 border border-gray-200 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Player ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">DOB</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Package</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Season</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Registered</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Special Request</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    {error ? 'Could not connect to DynamoDB' : 'No players found'}
                  </td>
                </tr>
              )}
              {filtered.map((p, i) => (
                <tr key={`${p.player_id}-${p.season}-${i}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{String(p.player_id ?? '')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {String(p.player_first_name ?? '')} {String(p.player_last_name ?? '')}
                    <div className="text-xs text-gray-400 font-normal">{String(p.gender ?? '')} · {String(p.new_or_returning ?? '')}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{String(p.birth_date ?? '')}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{String(p.package_name ?? '')}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium">
                      {String(p.season ?? '')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{String(p.registered_on ?? '')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      String(p.status) === 'Completed'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {String(p.status ?? '')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{String(p.account_email ?? '')}</td>
                  <td className="px-4 py-3 text-xs max-w-48">
                    {String(p.special_request ?? '').toLowerCase() === 'none' || !p.special_request
                      ? <span className="text-gray-300">—</span>
                      : <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{String(p.special_request)}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
