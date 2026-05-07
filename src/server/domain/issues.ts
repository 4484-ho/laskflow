import { z } from 'zod'
import {
  createIssueSchema,
  updateIssueSchema,
  issueListQuerySchema,
} from '@/lib/schemas'
import * as db from '@/server/db/issues'
import type { Issue } from '@/types'

// z.input gives the pre-parse (caller-provided) shape.
// Using z.input allows callers to pass raw values; domain functions validate internally.
export type CreateIssueDomainInput = z.input<typeof createIssueSchema>
export type UpdateIssueDomainInput = z.input<typeof updateIssueSchema>
export type ListIssuesParams = z.input<typeof issueListQuerySchema>

export async function createIssue(input: CreateIssueDomainInput): Promise<Issue> {
  const parsed = createIssueSchema.parse(input)
  // TODO(D4): replace placeholder with lexicographic sortOrder computation
  return db.createIssue({ ...parsed, sortOrder: String(Date.now()) })
}

export async function updateIssue(
  id: string,
  input: UpdateIssueDomainInput,
): Promise<Issue> {
  const parsed = updateIssueSchema.parse(input)
  return db.updateIssue(id, parsed)
}

export async function getIssue(id: string): Promise<Issue | null> {
  return db.getIssue(id)
}

export async function listIssues(params: ListIssuesParams = {}): Promise<Issue[]> {
  const parsed = issueListQuerySchema.parse(params)
  return db.getIssues(parsed)
}

export async function deleteIssue(id: string): Promise<void> {
  return db.deleteIssue(id)
}
