import { z } from 'zod'
import {
  createIssueSchema,
  updateIssueSchema,
  issueListQuerySchema,
} from '@/lib/schemas'
import * as db from '@/server/db/issues'
import type { Issue } from '@/types'

export type CreateIssueDomainInput = z.input<typeof createIssueSchema>
export type UpdateIssueDomainInput = z.input<typeof updateIssueSchema>
export type ListIssuesParams = z.input<typeof issueListQuerySchema>

export async function createIssue(input: CreateIssueDomainInput): Promise<Issue> {
  const parsed = createIssueSchema.parse(input)
  return db.createIssue(parsed)
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
