import { NextRequest, NextResponse } from 'next/server'
import { updateIssue, deleteIssue } from '@/lib/issues'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const body = await request.json()
    const issue = await updateIssue(id, body)
    return NextResponse.json(issue)
  } catch (e) {
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
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
}
