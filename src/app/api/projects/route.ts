import { NextRequest, NextResponse } from 'next/server'
import { getProjects, createProject } from '@/lib/projects'
import { createProjectSchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function GET() {
  try {
    return NextResponse.json(await getProjects())
  } catch (e) {
    console.error('GET /api/projects failed', e)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(createProjectSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await createProject(parsed.data), { status: 201 })
  } catch (e) {
    console.error('POST /api/projects failed', e)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
