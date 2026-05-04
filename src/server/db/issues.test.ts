import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/server/db/prisma', () => ({
  prisma: {
    issue: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/server/db/prisma'
import { getIssues, getIssue, createIssue, updateIssue, deleteIssue } from '@/server/db/issues'

const rawIssue = {
  id: 'issue-1',
  identifier: 'FE-1',
  title: 'Test issue',
  description: null,
  status: 'backlog',
  priority: 'none',
  projectId: 'proj-1',
  cycleId: null,
  parentId: null,
  labels: '["bug"]',
  dueDate: null,
  estimate: null,
  sortOrder: 0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getIssues', () => {
  it('returns parsed issues with labels as array', async () => {
    vi.mocked(prisma.issue.findMany).mockResolvedValue([rawIssue] as any)

    const result = await getIssues()

    expect(result).toHaveLength(1)
    expect(result[0].labels).toEqual(['bug'])
  })

  it('filters by status', async () => {
    vi.mocked(prisma.issue.findMany).mockResolvedValue([])

    await getIssues({ status: 'done' })

    expect(vi.mocked(prisma.issue.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'done' }),
      }),
    )
  })
})

describe('getIssue', () => {
  it('returns null when not found', async () => {
    vi.mocked(prisma.issue.findUnique).mockResolvedValue(null)

    const result = await getIssue('nonexistent')

    expect(result).toBeNull()
  })

  it('returns parsed issue when found', async () => {
    vi.mocked(prisma.issue.findUnique).mockResolvedValue(rawIssue as any)

    const result = await getIssue('issue-1')

    expect(result?.identifier).toBe('FE-1')
    expect(result?.labels).toEqual(['bug'])
  })
})

describe('createIssue', () => {
  it('auto-generates identifier from project prefix and counter', async () => {
    const mockProject = { id: 'proj-1', prefix: 'FE', issueCounter: 3 }
    const mockCreated = { ...rawIssue, identifier: 'FE-3', labels: '[]' }

    vi.mocked(prisma.project.update).mockResolvedValueOnce(mockProject as any)
    vi.mocked(prisma.issue.create).mockResolvedValueOnce(mockCreated as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma))

    const result = await createIssue({ title: 'New issue', projectId: 'proj-1' })

    expect(result.identifier).toBe('FE-3')
    expect(vi.mocked(prisma.project.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { issueCounter: { increment: 1 } },
      }),
    )
  })
})

describe('updateIssue', () => {
  it('updates and returns parsed issue', async () => {
    const updated = { ...rawIssue, status: 'done', labels: '[]' }
    vi.mocked(prisma.issue.update).mockResolvedValue(updated as any)

    const result = await updateIssue('issue-1', { status: 'done' })

    expect(result.status).toBe('done')
  })
})

describe('deleteIssue', () => {
  it('calls prisma.issue.delete with correct id', async () => {
    vi.mocked(prisma.issue.delete).mockResolvedValue(rawIssue as any)

    await deleteIssue('issue-1')

    expect(vi.mocked(prisma.issue.delete)).toHaveBeenCalledWith({ where: { id: 'issue-1' } })
  })
})
