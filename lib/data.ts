import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db } from './dynamo'
import type { Field, FieldStatus } from './fieldStatus'
import type { Program } from './programs'
import type { Sponsor } from './sponsors'
import type { AlumniStory } from './alumni'

export async function getFields(): Promise<Field[]> {
  const res = await db.send(new ScanCommand({ TableName: 'egs-fields' }))
  return (res.Items ?? []) as Field[]
}

export async function getPrograms(): Promise<Program[]> {
  const res = await db.send(new ScanCommand({ TableName: 'egs-programs' }))
  const items = (res.Items ?? []) as Program[]
  const order: Record<string, number> = {
    'future-stars': 0, 'recreational': 1, 'select': 2, 'academy': 3, 'camps': 4,
  }
  return items.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9))
}

export async function getSponsors(): Promise<Sponsor[]> {
  const res = await db.send(new ScanCommand({ TableName: 'egs-sponsors' }))
  const items = (res.Items ?? []) as Sponsor[]
  return items.sort((a, b) => {
    if (a.tier === b.tier) return a.name.localeCompare(b.name)
    return a.tier === 'premier' ? -1 : 1
  })
}

export async function getAlumni(): Promise<AlumniStory[]> {
  const res = await db.send(new ScanCommand({ TableName: 'egs-alumni' }))
  const items = (res.Items ?? []) as AlumniStory[]
  return items.sort((a, b) => b.gradYear - a.gradYear)
}

export function computeFieldSummary(fields: Field[]): { status: FieldStatus; message: string; updatedAt: string } {
  const hasClosed = fields.some(f => f.status === 'closed')
  const hasDelay = fields.some(f => f.status === 'delay')
  const lastUpdated = fields.length > 0 ? fields[0].updatedAt : 'N/A'
  if (hasClosed) {
    const closedField = fields.find(f => f.status === 'closed')!
    return { status: 'closed', message: 'Some fields closed. Check details below.', updatedAt: closedField.updatedAt }
  }
  if (hasDelay) {
    const delayedField = fields.find(f => f.status === 'delay')!
    return { status: 'delay', message: `${delayedField.name} at ${delayedField.complex} delayed. All others open.`, updatedAt: delayedField.updatedAt }
  }
  return { status: 'open', message: 'All fields clear for play.', updatedAt: lastUpdated }
}
