import { NextRequest, NextResponse } from 'next/server'
import { moveIssue } from '@/server/domain/issues'
import { moveIssueSchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function POST(
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

  const parsed = parseOrError(moveIssueSchema, body)
  if (!parsed.ok) return parsed.response

  const { beforeId = null, afterId = null } = parsed.data

  try {
    const issue = await moveIssue(id, { beforeId: beforeId ?? null, afterId: afterId ?? null })
    return NextResponse.json(issue)
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    console.error(`POST /api/issues/${id}/move failed`, e)
    return NextResponse.json({ error: 'Failed to move issue' }, { status: 500 })
  }
}
