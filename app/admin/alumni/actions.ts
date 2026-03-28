'use server'
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TABLE = 'egs-alumni'

function parseMilestones(text: string) {
  return text.split('\n')
    .map(line => line.trim()).filter(Boolean)
    .map(line => {
      const i = line.indexOf(':')
      if (i === -1) return null
      const year = parseInt(line.slice(0, i).trim())
      const achievement = line.slice(i + 1).trim()
      return isNaN(year) ? null : { year, achievement }
    })
    .filter(Boolean)
}

export async function saveAlumni(formData: FormData) {
  const item = {
    id: (formData.get('id') as string).trim(),
    name: formData.get('name') as string,
    gradYear: Number(formData.get('gradYear')),
    currentRole: formData.get('currentRole') as string,
    currentOrg: formData.get('currentOrg') as string,
    quote: formData.get('quote') as string,
    milestones: parseMilestones(formData.get('milestones') as string),
  }
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  revalidatePath('/admin/alumni')
  revalidatePath('/alumni')
  redirect('/admin/alumni')
}

export async function deleteAlumni(id: string) {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
  revalidatePath('/admin/alumni')
  revalidatePath('/alumni')
  redirect('/admin/alumni')
}
