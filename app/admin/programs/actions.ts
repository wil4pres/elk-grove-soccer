'use server'
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TABLE = 'egs-programs'

export async function saveProgram(formData: FormData) {
  const highlightsRaw = formData.get('highlights') as string
  const item = {
    id: (formData.get('id') as string).trim(),
    name: formData.get('name') as string,
    level: formData.get('level') as string,
    ageBand: formData.get('ageBand') as string,
    season: formData.get('season') as string,
    price: Number(formData.get('price')),
    capacity: Number(formData.get('capacity')),
    enrolled: Number(formData.get('enrolled')),
    registrationStatus: formData.get('registrationStatus') as string,
    opensDate: formData.get('opensDate') as string || undefined,
    description: formData.get('description') as string,
    highlights: highlightsRaw.split('\n').map(s => s.trim()).filter(Boolean),
    commitment: formData.get('commitment') as string,
    whoIsItFor: formData.get('whoIsItFor') as string,
  }
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  revalidatePath('/admin/programs')
  revalidatePath('/')
  revalidatePath('/programs')
  redirect('/admin/programs')
}

export async function deleteProgram(id: string) {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
  revalidatePath('/admin/programs')
  revalidatePath('/programs')
  redirect('/admin/programs')
}
