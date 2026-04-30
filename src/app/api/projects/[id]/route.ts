import { NextRequest, NextResponse } from 'next/server'
import { updateProject, deleteProject } from '@/lib/projects'
import { updateProjectSchema } from '@/lib/schemas'
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
  const parsed = parseOrError(updateProjectSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await updateProject(id, parsed.data))
  } catch (e) {
    console.error(`PATCH /api/projects/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await deleteProject(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error(`DELETE /api/projects/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
