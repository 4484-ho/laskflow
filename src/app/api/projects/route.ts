import { NextRequest, NextResponse } from 'next/server'
import { getProjects, createProject } from '@/lib/projects'

export async function GET() {
  try {
    return NextResponse.json(await getProjects())
  } catch {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const project = await createProject(body)
    return NextResponse.json(project, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
