import { NextRequest, NextResponse } from 'next/server'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  if (!await requireAdminSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await req.json()
  const id = (data.id as string)?.trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const item = {
    id,
    name: data.name ?? '',
    complex: data.complex ?? '',
    address: data.address ?? '',
    parkingInfo: data.parkingInfo ?? '',
    amenities: data.amenities ?? '',
    status: data.status ?? 'open',
    notes: data.notes ?? '',
    updatedBy: data.updatedBy ?? '',
    updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }

  await db.send(new PutCommand({ TableName: 'egs-fields', Item: item }))
  revalidatePath('/admin/fields')
  revalidatePath('/')
  return NextResponse.json({ success: true })
}
