import { NextRequest, NextResponse } from 'next/server'
import { updateInitiative, deleteInitiative } from '@/server/db/initiatives'
import { updateInitiativeSchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(updateInitiativeSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await updateInitiative(id, parsed.data))
  } catch (e) {
    console.error(`PATCH /api/initiatives/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await deleteInitiative(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error(`DELETE /api/initiatives/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to delete initiative' }, { status: 500 })
  }
}
