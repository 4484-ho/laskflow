import { NextRequest, NextResponse } from 'next/server'
import { listCycles, createCycle } from '@/server/domain/cycles'
import { createCycleSchema } from '@/lib/schemas'
import { parseOrError } from '@/lib/api-helpers'

export async function GET() {
  try {
    return NextResponse.json(await listCycles())
  } catch (e) {
    console.error('GET /api/cycles failed', e)
    return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = parseOrError(createCycleSchema, body)
  if (!parsed.ok) return parsed.response

  try {
    return NextResponse.json(await createCycle(parsed.data), { status: 201 })
  } catch (e) {
    console.error('POST /api/cycles failed', e)
    return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 })
  }
}
