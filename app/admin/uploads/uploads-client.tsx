'use client'

import { useState, useRef } from 'react'
import { adminFetch } from '@/app/admin/_utils/admin-fetch'

// ─── Shared CSV parser ─────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) lines.push(current)
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export default function UploadsClient() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Data Uploads</h1>
        <p className="text-gray-500 mt-1">Upload PlayMetrics CSV exports</p>
      </div>

      <div className="space-y-6">
        <PlayerRegistrationUpload />
        <TeamAssignmentUpload />
        <TeamImportUpload />
        <CoachImportUpload />
        <FieldImportUpload />
      </div>
    </div>
  )
}

function PlayerRegistrationUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [season, setSeason] = useState(String(new Date().getFullYear()))
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ total: number; inserted: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError('')
    setStatus('idle')

    const text = await f.text()
    const rows = parseCSV(text)
    setPreview(rows)
  }

  async function handleUpload() {
    if (!preview?.length) return
    setStatus('uploading')
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ rows: preview, season }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    setStatus('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const uniqueIds = preview ? new Set(preview.map(r => r['player_id'])).size : 0
  const packages = preview
    ? [...new Set(preview.map(r => r['package_name']?.trim()).filter(Boolean))].sort()
    : []

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center text-lg">
          📊
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Total Players Registered</h2>
          <p className="text-sm text-gray-500">PlayMetrics registration export — uploads new players, skips duplicates</p>
        </div>
      </div>

      {/* Season selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Season Year</label>
        <select
          value={season}
          onChange={e => setSeason(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white"
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* File input */}
      <div className="mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
        />
      </div>

      {/* Preview + Upload action */}
      {preview && status !== 'done' && (
        <div className="space-y-3">
          {/* Upload button — prominent, right at top of preview */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">{preview.length}</span> players ready
              {preview.length !== uniqueIds && (
                <span className="ml-1 text-blue-600">({uniqueIds} unique)</span>
              )}
              <span className="mx-2 text-blue-300">|</span>
              <span>{packages.length} age groups</span>
              <span className="mx-2 text-blue-300">|</span>
              <span>Season {season}</span>
            </div>
            <button
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {status === 'uploading' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </span>
              ) : (
                `Upload to DynamoDB`
              )}
            </button>
          </div>

          {packages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {packages.map(pkg => (
                <span key={pkg} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                  {pkg}
                </span>
              ))}
            </div>
          )}

          {/* Sample rows */}
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Gender</th>
                  <th className="px-3 py-2 text-left">DOB</th>
                  <th className="px-3 py-2 text-left">Package</th>
                  <th className="px-3 py-2 text-left">Registered</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500">{row['player_id']}</td>
                    <td className="px-3 py-1.5 text-gray-900">
                      {row['player_first_name']} {row['player_last_name']}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">{row['gender']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['birth_date']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['package_name']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['registered_on']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['status']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 5 && (
            <p className="text-xs text-gray-400">Showing 5 of {preview.length} rows</p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">
              ✓
            </div>
            <p className="font-semibold text-green-900 text-base">Upload Complete</p>
          </div>
          <div className="ml-10 text-green-700 space-y-1">
            <p><span className="font-semibold">{result.inserted}</span> new players added to DynamoDB</p>
            <p><span className="font-semibold">{result.skipped}</span> existing players skipped (already in {season} season)</p>
            <p className="text-green-600 text-xs mt-1">Total processed: {result.total}</p>
          </div>
          <div className="ml-10 mt-4">
            <button
              onClick={reset}
              className="bg-white border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm mt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
            <p className="font-semibold text-red-800">Upload Failed</p>
          </div>
          <p className="ml-8 text-red-700">{error}</p>
          <button
            onClick={() => { setError(''); setStatus('idle') }}
            className="ml-8 mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section 2: Players Assigned to Teams (DynamoDB) ─────────────────────────

function TeamAssignmentUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    total: number
    season: string
    teamsUpserted: number
    upserted: number
    unassigned: number
  } | null>(null)
  const [error, setError] = useState('')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setResult(null)
    setError('')
    setStatus('idle')
    const text = await f.text()
    const rows = parseCSV(text)
    setPreview(rows)
  }

  async function handleUpload() {
    if (!preview?.length) return
    setStatus('uploading')
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/team-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ rows: preview }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setError('')
    setStatus('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const rostered = preview ? preview.filter(r => r['assignment_status']?.toLowerCase() === 'rostered') : []
  const teams = preview ? [...new Set(preview.map(r => r['team']?.trim()).filter(Boolean))].sort() : []
  const detectedSeason = preview?.[0]?.['season']
    ? preview[0]['season'].match(/^(\d{4})/)?.[1] ?? preview[0]['season']
    : ''

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center text-lg">
          🗂️
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Players Assigned to Teams</h2>
          <p className="text-sm text-gray-500">Historical uploads only — past season player-to-team assignments for reference and matching context</p>
        </div>
      </div>

      {/* File input */}
      <div className="mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>

      {/* Preview + Upload */}
      {preview && status !== 'done' && (
        <div className="space-y-3">
          {/* Action bar */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">{rostered.length}</span> rostered players
              {preview.length !== rostered.length && (
                <span className="ml-1 text-blue-500">({preview.length - rostered.length} unassigned skipped)</span>
              )}
              <span className="mx-2 text-blue-300">|</span>
              <span>{teams.length} teams</span>
              {detectedSeason && (
                <>
                  <span className="mx-2 text-blue-300">|</span>
                  <span>Season {detectedSeason}</span>
                </>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {status === 'uploading' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload to DynamoDB'
              )}
            </button>
          </div>

          {/* Team tags */}
          {teams.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {teams.map(t => (
                <span key={t} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Sample rows */}
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-left">Player ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">DOB</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500 font-mono">{row['player_id']}</td>
                    <td className="px-3 py-1.5 text-gray-900">{row['player_first_name']} {row['player_last_name']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['birth_date']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['team']}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row['assignment_status']?.toLowerCase() === 'rostered'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>{row['assignment_status']}</span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{row['account_email']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 5 && (
            <p className="text-xs text-gray-400">Showing 5 of {preview.length} rows</p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">✓</div>
            <p className="font-semibold text-green-900 text-base">Upload Complete — Season {result.season}</p>
          </div>
          <div className="ml-10 text-green-700 space-y-1">
            <p><span className="font-semibold">{result.teamsUpserted}</span> teams written to egs-teams</p>
            <p><span className="font-semibold">{result.upserted}</span> rostered players upserted (new + updated)</p>
            {result.unassigned > 0 && (
              <p className="text-green-600"><span className="font-semibold">{result.unassigned}</span> unassigned/non-rostered rows ignored</p>
            )}
            <p className="text-green-600 text-xs mt-1">Total rows in file: {result.total}</p>
          </div>
          <div className="ml-10 mt-4">
            <button
              onClick={reset}
              className="bg-white border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm mt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
            <p className="font-semibold text-red-800">Upload Failed</p>
          </div>
          <p className="ml-8 text-red-700">{error}</p>
          <button
            onClick={() => { setError(''); setStatus('idle') }}
            className="ml-8 mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section 3: Team Import → Matching DB (SQLite) ────────────────────────────


function TeamImportUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    total: number
    skipped: number
    playersInserted: number
    teamsInserted: number
    assignmentsUpserted: number
    season: string
  } | null>(null)
  const [error, setError] = useState('')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setResult(null)
    setError('')
    setStatus('idle')
    const text = await f.text()
    const rows = parseCSV(text)
    setPreview(rows)
  }

  async function handleUpload() {
    if (!preview?.length) return
    setStatus('uploading')
    setError('')
    setResult(null)

    try {
      const res = await adminFetch('/api/admin/import-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ rows: preview }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStatus('error')
    }
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setError('')
    setStatus('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const rostered = preview ? preview.filter(r => r['assignment_status']?.toLowerCase() === 'rostered') : []
  const teams = preview ? [...new Set(preview.map(r => r['team']?.trim()).filter(Boolean))].sort() : []
  const detectedSeason = preview?.[0]?.['season']?.trim() ?? ''

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center text-lg">
          🏆
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Players Rostered on Teams</h2>
          <p className="text-sm text-gray-500">Upload current season&apos;s rostered players from PlayMetrics — run this frequently to keep the matching list current. Players already assigned here are excluded from matching recommendations.</p>
        </div>
      </div>

      {/* File input */}
      <div className="mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        />
      </div>

      {/* Preview + Upload */}
      {preview && status !== 'done' && (
        <div className="space-y-3">
          {/* Action bar */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">{rostered.length}</span> rostered players
              {preview.length !== rostered.length && (
                <span className="ml-1 text-blue-500">({preview.length - rostered.length} non-rostered skipped)</span>
              )}
              <span className="mx-2 text-blue-300">|</span>
              <span>{teams.length} teams</span>
              {detectedSeason && (
                <>
                  <span className="mx-2 text-blue-300">|</span>
                  <span>{detectedSeason}</span>
                </>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className="bg-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {status === 'uploading' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importing...
                </span>
              ) : (
                'Import to Matching DB'
              )}
            </button>
          </div>

          {/* Team tags */}
          {teams.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {teams.map(t => (
                <span key={t} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-100">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Sample rows */}
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-left">Player ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">DOB</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Season</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500 font-mono">{row['player_id']}</td>
                    <td className="px-3 py-1.5 text-gray-900">{row['player_first_name']} {row['player_last_name']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['birth_date']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['team']}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row['assignment_status']?.toLowerCase() === 'rostered'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>{row['assignment_status']}</span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{row['season']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 5 && (
            <p className="text-xs text-gray-400">Showing 5 of {preview.length} rows</p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">✓</div>
            <p className="font-semibold text-green-900 text-base">Import Complete — {result.season}</p>
          </div>
          <div className="ml-10 text-green-700 space-y-1">
            <p><span className="font-semibold">{result.teamsInserted}</span> new teams added to matching DB</p>
            <p><span className="font-semibold">{result.playersInserted}</span> new players added to matching DB</p>
            <p><span className="font-semibold">{result.assignmentsUpserted}</span> team assignments written</p>
            {result.skipped > 0 && (
              <p className="text-green-600"><span className="font-semibold">{result.skipped}</span> non-rostered rows skipped</p>
            )}
            <p className="text-green-600 text-xs mt-1">Total rows in file: {result.total}</p>
          </div>
          <div className="ml-10 mt-4">
            <button
              onClick={reset}
              className="bg-white border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm mt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
            <p className="font-semibold text-red-800">Import Failed</p>
          </div>
          <p className="ml-8 text-red-700">{error}</p>
          <button
            onClick={() => { setError(''); setStatus('idle') }}
            className="ml-8 mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section 4: Coach Import → Matching DB (SQLite) ───────────────────────────

function CoachImportUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    total: number
    inserted: number
    skipped: number
    uniqueCoaches: number
    uniqueTeams: number
    season: string
  } | null>(null)
  const [error, setError] = useState('')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setResult(null)
    setError('')
    setStatus('idle')
    const text = await f.text()
    const rows = parseCSV(text)
    setPreview(rows)
  }

  async function handleUpload() {
    if (!preview?.length) return
    setStatus('uploading')
    setError('')
    setResult(null)

    try {
      const res = await adminFetch('/api/admin/import-coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ rows: preview }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStatus('error')
    }
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setError('')
    setStatus('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const uniqueCoaches = preview
    ? new Set(preview.filter(r => r['user_id']?.trim()).map(r => r['user_id'])).size
    : 0
  const uniqueTeams = preview
    ? new Set(preview.filter(r => r['team_name']?.trim()).map(r => r['team_name'])).size
    : 0
  const detectedSeason = preview?.find(r => r['season']?.trim())?.['season'] ?? ''

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-lg">
          🧑‍🏫
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Coach Import</h2>
          <p className="text-sm text-gray-500">Upload current season&apos;s all-coaches export from PlayMetrics — replaces all coaches for the detected season. Run this frequently as coaches join.</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
        />
      </div>

      {preview && status !== 'done' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">{uniqueCoaches}</span> unique coaches
              <span className="mx-2 text-blue-300">|</span>
              <span>{preview.length}</span> coach-team rows
              <span className="mx-2 text-blue-300">|</span>
              <span>{uniqueTeams} teams</span>
              {detectedSeason && (
                <>
                  <span className="mx-2 text-blue-300">|</span>
                  <span>{detectedSeason}</span>
                </>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className="bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {status === 'uploading' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importing...
                </span>
              ) : (
                'Import to Matching DB'
              )}
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-left">User ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Season</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500 font-mono">{row['user_id']}</td>
                    <td className="px-3 py-1.5 text-gray-900">{row['first_name']} {row['last_name']}</td>
                    <td className="px-3 py-1.5 text-gray-500">{row['email']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['team_name']}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row['role'] === 'Head Coach'
                          ? 'bg-orange-50 text-orange-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>{row['role']}</span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{row['season']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 5 && (
            <p className="text-xs text-gray-400">Showing 5 of {preview.length} rows</p>
          )}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">✓</div>
            <p className="font-semibold text-green-900 text-base">Import Complete — {result.season}</p>
          </div>
          <div className="ml-10 text-green-700 space-y-1">
            <p><span className="font-semibold">{result.uniqueCoaches}</span> unique coaches</p>
            <p><span className="font-semibold">{result.inserted}</span> coach-team rows written ({result.uniqueTeams} teams)</p>
            {result.skipped > 0 && (
              <p className="text-green-600"><span className="font-semibold">{result.skipped}</span> rows skipped (missing user_id or season)</p>
            )}
            <p className="text-green-600 text-xs mt-1">Total rows in file: {result.total}</p>
          </div>
          <div className="ml-10 mt-4">
            <button
              onClick={reset}
              className="bg-white border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm mt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
            <p className="font-semibold text-red-800">Import Failed</p>
          </div>
          <p className="ml-8 text-red-700">{error}</p>
          <button
            onClick={() => { setError(''); setStatus('idle') }}
            className="ml-8 mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section 5: Field Catalog Import → Matching DB (SQLite) ──────────────────

function FieldImportUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    total: number
    inserted: number
    skipped: number
    facilities: number
    surfaces: Record<string, number>
  } | null>(null)
  const [error, setError] = useState('')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setResult(null)
    setError('')
    setStatus('idle')
    const text = await f.text()
    const rows = parseCSV(text)
    setPreview(rows)
  }

  async function handleUpload() {
    if (!preview?.length) return
    setStatus('uploading')
    setError('')
    setResult(null)

    try {
      const res = await adminFetch('/api/admin/import-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ rows: preview }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStatus('error')
    }
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setError('')
    setStatus('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const facilities = preview
    ? [...new Set(preview.filter(r => r['facility']?.trim()).map(r => r['facility'].trim()))].sort()
    : []
  const surfaceCounts = preview
    ? (['grass', 'turf', 'hardcourt'] as const).map(s => ({
        s,
        n: preview.filter(r => r['surface']?.trim().toLowerCase() === s).length,
      })).filter(x => x.n > 0)
    : []

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center text-lg">
          🏟️
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Field Catalog Import</h2>
          <p className="text-sm text-gray-500">Upload the PlayMetrics all-fields export — replaces the entire field catalog. Re-upload when fields are added or changed.</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
        />
      </div>

      {preview && status !== 'done' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">{preview.length}</span> fields
              <span className="mx-2 text-blue-300">|</span>
              <span>{facilities.length} facilities</span>
              {surfaceCounts.map(({ s, n }) => (
                <span key={s}>
                  <span className="mx-2 text-blue-300">|</span>
                  <span>{n} {s}</span>
                </span>
              ))}
            </div>
            <button
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {status === 'uploading' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importing...
                </span>
              ) : (
                'Import to Matching DB'
              )}
            </button>
          </div>

          {facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {facilities.map(f => (
                <span key={f} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100">
                  {f}
                </span>
              ))}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Facility</th>
                  <th className="px-3 py-2 text-left">Identifier</th>
                  <th className="px-3 py-2 text-left">Surface</th>
                  <th className="px-3 py-2 text-left">Address</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500 font-mono">{row['id']}</td>
                    <td className="px-3 py-1.5 text-gray-900">{row['facility']}</td>
                    <td className="px-3 py-1.5 text-gray-600">{row['identifier']}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row['surface'] === 'turf'
                          ? 'bg-emerald-50 text-emerald-700'
                          : row['surface'] === 'hardcourt'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>{row['surface']}</span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 truncate max-w-xs">{row['address']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 5 && (
            <p className="text-xs text-gray-400">Showing 5 of {preview.length} rows</p>
          )}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">✓</div>
            <p className="font-semibold text-green-900 text-base">Import Complete</p>
          </div>
          <div className="ml-10 text-green-700 space-y-1">
            <p><span className="font-semibold">{result.inserted}</span> fields imported across <span className="font-semibold">{result.facilities}</span> facilities</p>
            {Object.entries(result.surfaces).filter(([, n]) => n > 0).map(([s, n]) => (
              <p key={s} className="text-green-600">{n} {s}</p>
            ))}
            {result.skipped > 0 && (
              <p className="text-green-600"><span className="font-semibold">{result.skipped}</span> rows skipped (missing id)</p>
            )}
          </div>
          <div className="ml-10 mt-4">
            <button
              onClick={reset}
              className="bg-white border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm mt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
            <p className="font-semibold text-red-800">Import Failed</p>
          </div>
          <p className="ml-8 text-red-700">{error}</p>
          <button
            onClick={() => { setError(''); setStatus('idle') }}
            className="ml-8 mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
