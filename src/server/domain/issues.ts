import { z } from 'zod'
import {
  createIssueSchema,
  updateIssueSchema,
  issueListQuerySchema,
} from '@/lib/schemas'
import * as db from '@/server/db/issues'
import { keyBetween } from '@/lib/fractional-index'
import { NotFoundError, BadRequestError } from '@/lib/errors'
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
  // TODO: Race condition — read-then-write is not atomic. Concurrent creates for the same
  // project may generate duplicate sortOrder keys. Fix: move sortOrder computation into
  // db.createIssue using a prisma.$transaction with findFirst. Acceptable for single-user
  // use in Phase 2a; address before multi-user or high-frequency create scenarios.
  const existing = await db.getIssues({ projectId: parsed.projectId })
  // db.getIssues returns issues ordered by sortOrder asc, so last element is the max key
  const lastKey = existing.at(-1)?.sortOrder ?? null
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
  const target = await db.getIssue(id)
  if (!target) throw new NotFoundError(`moveIssue: issue "${id}" not found`)

  if (params.beforeId === id || params.afterId === id) {
    throw new BadRequestError(`moveIssue: issue "${id}" cannot reference itself as a neighbor`)
  }

  let beforeKey: string | null = null
  if (params.beforeId) {
    const before = await db.getIssue(params.beforeId)
    if (!before) throw new NotFoundError(`moveIssue: beforeId "${params.beforeId}" not found`)
    beforeKey = before.sortOrder
  }

  let afterKey: string | null = null
  if (params.afterId) {
    const after = await db.getIssue(params.afterId)
    if (!after) throw new NotFoundError(`moveIssue: afterId "${params.afterId}" not found`)
    afterKey = after.sortOrder
  }

  if (beforeKey !== null && afterKey !== null && beforeKey >= afterKey) {
    throw new BadRequestError(
      `moveIssue: beforeId sort key must precede afterId sort key (got "${beforeKey}" >= "${afterKey}")`,
    )
  }

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
