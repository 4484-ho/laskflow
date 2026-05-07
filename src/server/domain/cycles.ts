import { z } from 'zod'
import { createCycleSchema, updateCycleSchema } from '@/lib/schemas'
import * as db from '@/server/db/cycles'
import type { Cycle } from '@/types'

// z.input gives the pre-parse (caller-provided) shape.
export type CreateCycleDomainInput = z.input<typeof createCycleSchema>
export type UpdateCycleDomainInput = z.input<typeof updateCycleSchema>

export async function createCycle(input: CreateCycleDomainInput): Promise<Cycle> {
  return db.createCycle(createCycleSchema.parse(input))
}

export async function updateCycle(
  id: string,
  input: UpdateCycleDomainInput,
): Promise<Cycle> {
  return db.updateCycle(id, updateCycleSchema.parse(input))
}

export async function getCycle(id: string): Promise<Cycle | null> {
  return db.getCycle(id)
}

export async function listCycles(): Promise<Cycle[]> {
  return db.getCycles()
}

export async function deleteCycle(id: string): Promise<void> {
  return db.deleteCycle(id)
}
