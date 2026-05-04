import { NextRequest, NextResponse } from 'next/server'
import { updateIssue, deleteIssue } from '@/server/db/issues'
import { updateIssueSchema } from '@/lib/schemas'
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
  const parsed = parseOrError(updateIssueSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await updateIssue(id, parsed.data))
  } catch (e) {
    console.error(`PATCH /api/issues/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await deleteIssue(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error(`DELETE /api/issues/${id} failed`, e)
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
}
