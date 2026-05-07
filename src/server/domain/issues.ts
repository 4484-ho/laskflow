import { z } from 'zod'
import {
  createIssueSchema,
  updateIssueSchema,
  issueListQuerySchema,
} from '@/lib/schemas'
import * as db from '@/server/db/issues'
import { keyBetween } from '@/lib/fractional-index'
import type { Issue } from '@/types'

// z.input gives the pre-parse (caller-provided) shape.
// Using z.input allows callers to pass raw values; domain functions validate internally.
export type CreateIssueDomainInput = z.input<typeof createIssueSchema>
export type UpdateIssueDomainInput = z.input<typeof updateIssueSchema>
export type ListIssuesParams = z.input<typeof issueListQuerySchema>

export interface MoveIssueParams {
  beforeId: string | null
  afterId: string | null
}

export async function createIssue(input: CreateIssueDomainInput): Promise<Issue> {
  const parsed = createIssueSchema.parse(input)
  // Assign sortOrder after the last existing issue in this project (or a fresh key if none)
  const existing = await db.getIssues({ projectId: parsed.projectId })
  const lastKey =
    existing.length > 0
      ? [...existing.map((i) => i.sortOrder)].sort().at(-1) ?? null
      : null
  const sortOrder = keyBetween(lastKey, null)
  return db.createIssue({ ...parsed, sortOrder })
}

export async function updateIssue(
  id: string,
  input: UpdateIssueDomainInput,
): Promise<Issue> {
  const parsed = updateIssueSchema.parse(input)
  return db.updateIssue(id, parsed)
}

export async function moveIssue(id: string, params: MoveIssueParams): Promise<Issue> {
  const beforeKey = params.beforeId
    ? ((await db.getIssue(params.beforeId))?.sortOrder ?? null)
    : null
  const afterKey = params.afterId
    ? ((await db.getIssue(params.afterId))?.sortOrder ?? null)
    : null
  const newKey = keyBetween(beforeKey, afterKey)
  return db.updateSortOrder(id, newKey)
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
