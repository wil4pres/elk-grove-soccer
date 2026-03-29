import { NextRequest, NextResponse } from 'next/server'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { db } from '@/lib/dynamo'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await db.send(new DeleteCommand({ TableName: 'egs-fields', Key: { id } }))
  revalidatePath('/admin/fields')
  revalidatePath('/')
  return NextResponse.json({ success: true })
}
