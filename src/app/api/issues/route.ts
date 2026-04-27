import { NextRequest, NextResponse } from 'next/server'
import { getIssues, createIssue } from '@/lib/issues'
import type { IssueStatus, IssuePriority } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  try {
    const issues = await getIssues({
      status: (searchParams.get('status') as IssueStatus) ?? undefined,
      priority: (searchParams.get('priority') as IssuePriority) ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      cycleId: searchParams.get('cycleId') ?? undefined,
    })
    return NextResponse.json(issues)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const issue = await createIssue(body)
    return NextResponse.json(issue, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
