import { z } from 'zod'
import { createProjectSchema, updateProjectSchema } from '@/lib/schemas'
import * as db from '@/server/db/projects'
import type { Project } from '@/types'

// z.input gives the pre-parse (caller-provided) shape.
export type CreateProjectDomainInput = z.input<typeof createProjectSchema>
export type UpdateProjectDomainInput = z.input<typeof updateProjectSchema>

export async function createProject(input: CreateProjectDomainInput): Promise<Project> {
  return db.createProject(createProjectSchema.parse(input))
}

export async function updateProject(
  id: string,
  input: UpdateProjectDomainInput,
): Promise<Project> {
  return db.updateProject(id, updateProjectSchema.parse(input))
}

export async function getProject(id: string): Promise<Project | null> {
  return db.getProject(id)
}

export async function listProjects(): Promise<Project[]> {
  return db.getProjects()
}

export async function deleteProject(id: string): Promise<void> {
  return db.deleteProject(id)
}
