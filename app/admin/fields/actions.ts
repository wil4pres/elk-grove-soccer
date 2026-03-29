'use server'
import { PutCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TABLE = 'egs-fields'

export async function saveField(formData: FormData) {
  const id = (formData.get('id') as string).trim()
  const item = {
    id,
    name: formData.get('name') as string,
    complex: formData.get('complex') as string,
    address: (formData.get('address') as string) ?? '',
    parkingInfo: (formData.get('parkingInfo') as string) ?? '',
    amenities: (formData.get('amenities') as string) ?? '',
    status: formData.get('status') as string,
    notes: (formData.get('notes') as string) ?? '',
    updatedBy: (formData.get('updatedBy') as string) ?? '',
    updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  revalidatePath('/admin/fields')
  revalidatePath('/')
  redirect('/admin/fields')
}

export async function deleteField(id: string) {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
  revalidatePath('/admin/fields')
  revalidatePath('/')
  redirect('/admin/fields')
}

export async function updateFieldStatus(id: string, status: 'open' | 'delay' | 'closed') {
  const updatedAt = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: 'SET #s = :s, updatedAt = :t',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': status, ':t': updatedAt },
  }))
  revalidatePath('/admin/fields')
  revalidatePath('/')
}
