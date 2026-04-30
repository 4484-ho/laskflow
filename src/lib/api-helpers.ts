import { NextResponse } from 'next/server'
import type { ZodError, ZodType } from 'zod'

export function badRequest(error: ZodError) {
  return NextResponse.json(
    { error: 'Invalid request', details: error.issues },
    { status: 400 },
  )
}

export function parseOrError<T>(schema: ZodType<T>, value: unknown):
  | { ok: true; data: T }
  | { ok: false; response: NextResponse } {
  const result = schema.safeParse(value)
  if (!result.success) return { ok: false, response: badRequest(result.error) }
  return { ok: true, data: result.data }
}
