import { NextRequest, NextResponse } from 'next/server'
import { updateInitiative, deleteInitiative } from '@/lib/initiatives'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { return NextResponse.json(await updateInitiative(id, await request.json())) }
  catch { return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 }) }
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await deleteInitiative(id); return new NextResponse(null, { status: 204 }) }
  catch { return NextResponse.json({ error: 'Failed to delete initiative' }, { status: 500 }) }
}
