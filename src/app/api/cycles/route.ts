import { NextRequest, NextResponse } from 'next/server'
import { getCycles, createCycle } from '@/lib/cycles'

export async function GET() {
  try { return NextResponse.json(await getCycles()) }
  catch { return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 }) }
}
export async function POST(request: NextRequest) {
  try { return NextResponse.json(await createCycle(await request.json()), { status: 201 }) }
  catch { return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 }) }
}
