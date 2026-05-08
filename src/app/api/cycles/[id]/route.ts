import { NextRequest, NextResponse } from 'next/server'
import { updateCycle, deleteCycle } from '@/server/domain/cycles'
import { updateCycleSchema } from '@/lib/schemas'
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
  const parsed = parseOrError(updateCycleSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await updateCycle(id, parsed.data))
  } catch (e) {
    console.error(`PATCH /api/cycles/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to update cycle' }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await deleteCycle(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error(`DELETE /api/cycles/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to delete cycle' }, { status: 500 })
  }
}
