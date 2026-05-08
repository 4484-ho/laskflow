import { z } from 'zod'
import { createInitiativeSchema, updateInitiativeSchema } from '@/lib/schemas'
import * as db from '@/server/db/initiatives'
import type { Initiative } from '@/types'

// z.input gives the pre-parse (caller-provided) shape.
export type CreateInitiativeDomainInput = z.input<typeof createInitiativeSchema>
export type UpdateInitiativeDomainInput = z.input<typeof updateInitiativeSchema>

export async function createInitiative(
  input: CreateInitiativeDomainInput,
): Promise<Initiative> {
  return db.createInitiative(createInitiativeSchema.parse(input))
}

export async function updateInitiative(
  id: string,
  input: UpdateInitiativeDomainInput,
): Promise<Initiative> {
  return db.updateInitiative(id, updateInitiativeSchema.parse(input))
}

export async function getInitiative(id: string): Promise<Initiative | null> {
  return db.getInitiative(id)
}

export async function listInitiatives(): Promise<Initiative[]> {
  return db.getInitiatives()
}

export async function deleteInitiative(id: string): Promise<void> {
  return db.deleteInitiative(id)
}
