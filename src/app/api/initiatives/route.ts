import { NextRequest, NextResponse } from 'next/server'
import { getInitiatives, createInitiative } from '@/lib/initiatives'

export async function GET() {
  try { return NextResponse.json(await getInitiatives()) }
  catch { return NextResponse.json({ error: 'Failed to fetch initiatives' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(await createInitiative(await request.json()), { status: 201 })
  } catch { return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 }) }
}
