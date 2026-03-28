export interface Match {
  id: string
  date: string
  time: string
  homeTeam: string
  awayClub: string
  awayTeam: string
  location: string
  division: string
  age: number
  gender: 'Male' | 'Female'
  eventName: string
  notes: string
}

const SHEET_ID = '16bRzFp0IghrxTgSmLwrPymM9goh8fx5kXadiRTlXhaI'
const GID = '1891176485'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`

function parseDate(raw: string): string {
  if (!raw) return ''
  // Handle both 3/28/2026 and 3/28/26 formats
  const parts = raw.split('/')
  if (parts.length !== 3) return raw
  let year = parts[2]
  if (year.length === 2) year = '20' + year
  return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(current.trim())
        current = ''
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current.trim())
        rows.push(row)
        row = []
        current = ''
        if (ch === '\r') i++
      } else {
        current += ch
      }
    }
  }
  if (current || row.length) {
    row.push(current.trim())
    rows.push(row)
  }
  return rows
}

export async function getSchedule(): Promise<Match[]> {
  try {
    const res = await fetch(CSV_URL, { next: { revalidate: 300 } }) // cache 5 min
    if (!res.ok) return []
    const text = await res.text()
    const rows = parseCSV(text)

    // Skip header row
    const matches: Match[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      // Skip empty rows, day headers (FRIDAY, SATURDAY, etc.), and section markers
      if (!r[0] || !r[1] || !r[2]) continue

      const date = parseDate(r[1])
      if (!date) continue

      matches.push({
        id: r[0],
        date,
        time: r[2]?.replace(' PDT', '') ?? '',
        homeTeam: r[3] ?? '',
        awayClub: r[4] ?? '',
        awayTeam: r[5] ?? '',
        location: r[6] ?? '',
        division: r[7] ?? '',
        age: parseInt(r[8]) || 0,
        gender: r[9] === 'Female' ? 'Female' : 'Male',
        eventName: r[10] ?? '',
        notes: r[11] ?? '',
      })
    }

    // Sort by date then time
    matches.sort((a, b) => {
      const d = a.date.localeCompare(b.date)
      if (d !== 0) return d
      return a.time.localeCompare(b.time)
    })

    return matches
  } catch {
    return []
  }
}
