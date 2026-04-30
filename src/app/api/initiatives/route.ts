import { NextRequest, NextResponse } from 'next/server'
import { getInitiatives, createInitiative } from '@/lib/initiatives'
import { createInitiativeSchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function GET() {
  try {
    return NextResponse.json(await getInitiatives())
  } catch (e) {
    console.error('GET /api/initiatives failed', e)
    return NextResponse.json({ error: 'Failed to fetch initiatives' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(createInitiativeSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await createInitiative(parsed.data), { status: 201 })
  } catch (e) {
    console.error('POST /api/initiatives failed', e)
    return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 })
  }
}
