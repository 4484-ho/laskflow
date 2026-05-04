import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/server/db/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/server/db/prisma'
import { getProjects, createProject, updateProject, deleteProject } from '@/server/db/projects'

const rawProject = {
  id: 'proj-1',
  title: 'Frontend',
  description: null,
  prefix: 'FE',
  color: null,
  status: 'active',
  issueCounter: 0,
  initiativeId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => vi.clearAllMocks())

describe('getProjects', () => {
  it('returns projects ordered by createdAt', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([rawProject] as any)
    const result = await getProjects()
    expect(result).toHaveLength(1)
    expect(result[0].prefix).toBe('FE')
  })
})

describe('createProject', () => {
  it('creates a project with the given data', async () => {
    vi.mocked(prisma.project.create).mockResolvedValue(rawProject as any)
    const result = await createProject({ title: 'Frontend', prefix: 'FE' })
    expect(result.prefix).toBe('FE')
  })
})

describe('deleteProject', () => {
  it('calls prisma.project.delete with correct id', async () => {
    vi.mocked(prisma.project.delete).mockResolvedValue(rawProject as any)
    await deleteProject('proj-1')
    expect(vi.mocked(prisma.project.delete)).toHaveBeenCalledWith({ where: { id: 'proj-1' } })
  })
})
