import type { Issue as PrismaIssue } from '@prisma/client'
import { prisma } from '@/server/db/prisma'
import type { Issue, IssueStatus, IssuePriority, CreateIssueInput, UpdateIssueInput } from '@/types'

type PrismaIssueWithChildren = PrismaIssue & { children: PrismaIssue[] }

interface GetIssuesParams {
  status?: IssueStatus
  priority?: IssuePriority
  projectId?: string
  cycleId?: string
  initiativeId?: string
  sort?: 'sortOrder' | 'priority' | 'createdAt' | 'updatedAt'
  includeSubtasks?: boolean
}

function parseIssue(raw: PrismaIssue): Issue {
  return {
    ...raw,
    status: raw.status as IssueStatus,
    priority: raw.priority as IssuePriority,
    labels: JSON.parse(raw.labels ?? '[]') as string[],
  }
}

function parseIssueWithChildren(raw: PrismaIssueWithChildren): Issue {
  return {
    ...parseIssue(raw),
    children: raw.children.map(parseIssue),
  }
}

export async function getIssues(params: GetIssuesParams = {}): Promise<Issue[]> {
  const where: Record<string, unknown> = {}
  if (params.status) where.status = params.status
  if (params.priority) where.priority = params.priority
  if (params.projectId) where.projectId = params.projectId
  if (params.cycleId) where.cycleId = params.cycleId
  if (!params.includeSubtasks) where.parentId = null  // hide subtasks from list
  if (params.initiativeId) {
    where.project = { initiativeId: params.initiativeId }
  }

  const sort = params.sort ?? 'sortOrder'
  const orderBy =
    sort === 'sortOrder'
      ? [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }]
      : sort === 'priority'
      ? [{ priority: 'asc' as const }, { createdAt: 'desc' as const }]
      : [{ [sort]: 'desc' as const }]

  const issues = await prisma.issue.findMany({ where, orderBy })
  return issues.map(parseIssue)
}

export async function getIssue(id: string): Promise<Issue | null> {
  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { children: true },
  })
  return issue ? parseIssueWithChildren(issue as PrismaIssueWithChildren) : null
}

export async function createIssue(
  data: CreateIssueInput & { sortOrder: string },
): Promise<Issue> {
  const issue = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: data.projectId },
      data: { issueCounter: { increment: 1 } },
    })
    return tx.issue.create({
      data: {
        identifier: `${project.prefix}-${project.issueCounter}`,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? 'backlog',
        priority: data.priority ?? 'none',
        projectId: data.projectId,
        cycleId: data.cycleId ?? null,
        parentId: data.parentId ?? null,
        labels: JSON.stringify(data.labels ?? []),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimate: data.estimate ?? null,
        sortOrder: data.sortOrder,
      },
    })
  })
  return parseIssue(issue)
}

export async function updateIssue(id: string, data: UpdateIssueInput): Promise<Issue> {
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.projectId !== undefined) updateData.projectId = data.projectId
  if (data.cycleId !== undefined) updateData.cycleId = data.cycleId
  if (data.parentId !== undefined) updateData.parentId = data.parentId
  if (data.labels !== undefined) updateData.labels = JSON.stringify(data.labels)
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
  if (data.estimate !== undefined) updateData.estimate = data.estimate

  const issue = await prisma.issue.update({ where: { id }, data: updateData })
  return parseIssue(issue)
}

export async function deleteIssue(id: string): Promise<void> {
  await prisma.issue.delete({ where: { id } })
}

export async function updateSortOrder(id: string, sortOrder: string): Promise<Issue> {
  const issue = await prisma.issue.update({ where: { id }, data: { sortOrder } })
  return parseIssue(issue)
}
