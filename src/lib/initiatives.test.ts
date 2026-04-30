import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    initiative: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getInitiatives, createInitiative, deleteInitiative } from '@/lib/initiatives'

const rawInitiative = {
  id: 'init-1',
  title: 'Q3 Release',
  description: null,
  status: 'active',
  color: null,
  startDate: null,
  targetDate: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => vi.clearAllMocks())

describe('getInitiatives', () => {
  it('returns initiatives', async () => {
    vi.mocked(prisma.initiative.findMany).mockResolvedValue([rawInitiative] as any)
    const result = await getInitiatives()
    expect(result[0].title).toBe('Q3 Release')
  })
})

describe('createInitiative', () => {
  it('creates an initiative', async () => {
    vi.mocked(prisma.initiative.create).mockResolvedValue(rawInitiative as any)
    const result = await createInitiative({ title: 'Q3 Release' })
    expect(result.id).toBe('init-1')
  })
})

describe('deleteInitiative', () => {
  it('calls prisma.initiative.delete with correct id', async () => {
    vi.mocked(prisma.initiative.delete).mockResolvedValue(rawInitiative as any)
    await deleteInitiative('init-1')
    expect(vi.mocked(prisma.initiative.delete)).toHaveBeenCalledWith({ where: { id: 'init-1' } })
  })
})
