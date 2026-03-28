'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { Match } from '@/lib/schedule'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(raw: string): string {
  if (!raw) return ''
  // Already formatted like "5:00 PM"
  return raw
}

export default function ScheduleFilter({ matches }: { matches: Match[] }) {
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [ageFilter, setAgeFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [venueFilter, setVenueFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Extract unique filter values
  const dates = useMemo(() => [...new Set(matches.map(m => m.date))].sort(), [matches])
  const ages = useMemo(() => [...new Set(matches.map(m => m.age))].filter(a => a > 0).sort((a, b) => a - b), [matches])
  const venues = useMemo(() => [...new Set(matches.map(m => m.location))].filter(Boolean).sort(), [matches])

  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (dateFilter !== 'all' && m.date !== dateFilter) return false
      if (ageFilter !== 'all' && m.age !== Number(ageFilter)) return false
      if (genderFilter !== 'all' && m.gender !== genderFilter) return false
      if (venueFilter !== 'all' && m.location !== venueFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const searchable = `${m.homeTeam} ${m.awayClub} ${m.awayTeam} ${m.location} ${m.division} ${m.eventName}`.toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [matches, dateFilter, ageFilter, genderFilter, venueFilter, search])

  // Group filtered matches by date
  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of filtered) {
      const arr = map.get(m.date) ?? []
      arr.push(m)
      map.set(m.date, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const activeFilters = [dateFilter, ageFilter, genderFilter, venueFilter].filter(f => f !== 'all').length + (search ? 1 : 0)

  // Auto-scroll to today's section (or nearest future date) on mount
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (scrolledRef.current || grouped.length === 0) return
    scrolledRef.current = true
    const today = new Date().toISOString().slice(0, 10)
    // Find today or the first future date
    const targetDate = grouped.find(([d]) => d >= today)?.[0]
    if (!targetDate) return
    // Small delay so DOM is ready
    requestAnimationFrame(() => {
      const el = document.getElementById(`schedule-date-${targetDate}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [grouped])

  return (
    <div>
      {/* Filters */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cloud/30">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search teams, venues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl py-2.5 pl-10 pr-3 text-sm text-cloud placeholder:text-cloud/30 focus:outline-none focus:border-leaf/40"
            />
          </div>

          {/* Date */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.1] rounded-xl py-2.5 px-3 text-sm text-cloud focus:outline-none focus:border-leaf/40 appearance-none cursor-pointer"
          >
            <option value="all">All Dates</option>
            {dates.map(d => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>

          {/* Age */}
          <select
            value={ageFilter}
            onChange={e => setAgeFilter(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.1] rounded-xl py-2.5 px-3 text-sm text-cloud focus:outline-none focus:border-leaf/40 appearance-none cursor-pointer"
          >
            <option value="all">All Ages</option>
            {ages.map(a => (
              <option key={a} value={a}>U{a}</option>
            ))}
          </select>

          {/* Gender */}
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.1] rounded-xl py-2.5 px-3 text-sm text-cloud focus:outline-none focus:border-leaf/40 appearance-none cursor-pointer"
          >
            <option value="all">All Genders</option>
            <option value="Male">Boys</option>
            <option value="Female">Girls</option>
          </select>

          {/* Venue */}
          <select
            value={venueFilter}
            onChange={e => setVenueFilter(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.1] rounded-xl py-2.5 px-3 text-sm text-cloud focus:outline-none focus:border-leaf/40 appearance-none cursor-pointer"
          >
            <option value="all">All Venues</option>
            {venues.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {activeFilters > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-cloud/40">{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>
            <button
              onClick={() => { setDateFilter('all'); setAgeFilter('all'); setGenderFilter('all'); setVenueFilter('all'); setSearch('') }}
              className="text-xs text-leaf hover:text-leaf/80 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 text-center">
          <p className="text-cloud/40 text-sm">No matches found for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([date, dayMatches]) => (
            <div key={date} id={`schedule-date-${date}`} className="scroll-mt-24">
              <h3 className="text-sm font-semibold text-cloud/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                {formatDate(date)}
              </h3>

              <div className="space-y-2">
                {dayMatches.map(match => (
                  <div
                    key={match.id}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Time & Venue */}
                      <div className="sm:w-32 shrink-0">
                        <p className="text-sm font-semibold text-sunset">{formatTime(match.time)}</p>
                        <p className="text-xs text-cloud/40">{match.location}</p>
                      </div>

                      {/* Teams */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-cloud">{match.homeTeam}</span>
                          <span className="text-xs text-cloud/30">vs</span>
                          <span className="text-sm text-cloud/70">{match.awayClub}{match.awayTeam ? ` ${match.awayTeam}` : ''}</span>
                        </div>
                        {match.eventName && (
                          <p className="text-xs text-cloud/35 mt-0.5">{match.eventName}</p>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-2 shrink-0">
                        {match.age > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-leaf/[0.1] border border-leaf/[0.15] text-xs font-medium text-leaf">
                            U{match.age}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          match.gender === 'Female'
                            ? 'bg-rose/[0.1] border border-rose/[0.15] text-rose'
                            : 'bg-aqua/[0.1] border border-aqua/[0.15] text-aqua'
                        }`}>
                          {match.gender === 'Female' ? 'Girls' : 'Boys'}
                        </span>
                      </div>
                    </div>

                    {match.notes && (
                      <p className="text-xs text-amber mt-2 pl-0 sm:pl-32">{match.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
