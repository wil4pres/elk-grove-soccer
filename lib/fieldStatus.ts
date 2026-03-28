export type FieldStatus = 'open' | 'delay' | 'closed'

export interface Field {
  id: string
  name: string
  complex: string
  status: FieldStatus
  notes: string
  updatedAt: string
  updatedBy: string
}

export const mockFields: Field[] = [
  { id: 'ci-f1', name: 'Field 1', complex: 'Cherry Island Complex', status: 'open', notes: 'Surface clear. Trainers on site.', updatedAt: '7:55 AM', updatedBy: 'Coach Reyes' },
  { id: 'ci-f2', name: 'Field 2', complex: 'Cherry Island Complex', status: 'open', notes: 'Kickoff 09:30 — Academy Navy vs Folsom.', updatedAt: '7:55 AM', updatedBy: 'Coach Reyes' },
  { id: 'ci-f4', name: 'Field 4', complex: 'Cherry Island Complex', status: 'open', notes: 'Kickoff 08:45 — 10U Green vs Storm FC.', updatedAt: '7:55 AM', updatedBy: 'Coach Reyes' },
  { id: 'ci-f7', name: 'Field 7', complex: 'Cherry Island Complex', status: 'delay', notes: 'Standing water near south goal. Re-evaluate 9 AM.', updatedAt: '8:02 AM', updatedBy: 'Field Crew' },
  { id: 'lo-f1', name: 'Field 1', complex: 'Laguna Park Complex', status: 'open', notes: 'All clear.', updatedAt: '7:45 AM', updatedBy: 'Admin' },
  { id: 'lo-f2', name: 'Field 2', complex: 'Laguna Park Complex', status: 'open', notes: 'U8 rec games, 9 AM start.', updatedAt: '7:45 AM', updatedBy: 'Admin' },
]

export function getFieldStatusSummary() {
  const hasClosed = mockFields.some(f => f.status === 'closed')
  const hasDelay = mockFields.some(f => f.status === 'delay')
  if (hasClosed) return { status: 'closed' as FieldStatus, message: 'Some fields closed. Check details.', updatedAt: '8:10 AM' }
  if (hasDelay) return { status: 'delay' as FieldStatus, message: 'Field 7 at Cherry Island delayed. All others open.', updatedAt: '8:02 AM' }
  return { status: 'open' as FieldStatus, message: 'All fields clear for play.', updatedAt: '7:55 AM' }
}
