'use server'
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TABLE = 'egs-sponsors'

export async function saveSponsor(formData: FormData) {
  const item = {
    id: (formData.get('id') as string).trim(),
    name: formData.get('name') as string,
    tier: formData.get('tier') as string,
    tagline: formData.get('tagline') as string,
    initials: formData.get('initials') as string,
    ctaLabel: formData.get('ctaLabel') as string,
    ctaHref: formData.get('ctaHref') as string,
  }
  await db.send(new PutCommand({ TableName: TABLE, Item: item }))
  revalidatePath('/admin/sponsors')
  revalidatePath('/')
  revalidatePath('/sponsors')
  redirect('/admin/sponsors')
}

export async function deleteSponsor(id: string) {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
  revalidatePath('/admin/sponsors')
  revalidatePath('/')
  revalidatePath('/sponsors')
  redirect('/admin/sponsors')
}
