import { NextRequest, NextResponse } from 'next/server'
import { updateCycle, deleteCycle } from '@/lib/cycles'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { return NextResponse.json(await updateCycle(id, await request.json())) }
  catch { return NextResponse.json({ error: 'Failed to update cycle' }, { status: 500 }) }
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await deleteCycle(id); return new NextResponse(null, { status: 204 }) }
  catch { return NextResponse.json({ error: 'Failed to delete cycle' }, { status: 500 }) }
}
