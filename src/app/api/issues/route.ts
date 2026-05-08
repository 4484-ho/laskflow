import { NextRequest, NextResponse } from 'next/server'
import { listIssues, createIssue } from '@/server/domain/issues'
import { createIssueSchema, issueListQuerySchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = parseOrError(issueListQuerySchema, {
    status: searchParams.get('status') ?? undefined,
    priority: searchParams.get('priority') ?? undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    cycleId: searchParams.get('cycleId') ?? undefined,
  })
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await listIssues(parsed.data))
  } catch (e) {
    console.error('GET /api/issues failed', e)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(createIssueSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await createIssue(parsed.data), { status: 201 })
  } catch (e) {
    console.error('POST /api/issues failed', e)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
