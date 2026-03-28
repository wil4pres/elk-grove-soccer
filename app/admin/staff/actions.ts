'use server'
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TABLE = 'egs-staff'

export async function saveStaff(formData: FormData) {
  const item = {
    id: (formData.get('id') as string).trim(),
    name: formData.get('name') as string,
    role: formData.get('role') as string,
    bio: formData.get('bio') as string,
    email: formData.get('email') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    sortOrder: Number(formData.get('sortOrder') ?? 99),
  }
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  revalidatePath('/admin/staff')
  revalidatePath('/staff')
  redirect('/admin/staff')
}

export async function deleteStaff(id: string) {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
  revalidatePath('/admin/staff')
  revalidatePath('/staff')
  redirect('/admin/staff')
}
