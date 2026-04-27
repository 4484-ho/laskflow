import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cycle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getCycles, createCycle } from '@/lib/cycles'

const rawCycle = {
  id: 'cycle-1',
  title: 'Sprint 2026-W17',
  description: null,
  status: 'active',
  startDate: new Date('2026-04-21'),
  endDate: new Date('2026-04-27'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

beforeEach(() => vi.clearAllMocks())

describe('getCycles', () => {
  it('returns cycles ordered by startDate', async () => {
    vi.mocked(prisma.cycle.findMany).mockResolvedValue([rawCycle] as any)
    const result = await getCycles()
    expect(result[0].title).toBe('Sprint 2026-W17')
  })
})

describe('createCycle', () => {
  it('creates a cycle with startDate and endDate', async () => {
    vi.mocked(prisma.cycle.create).mockResolvedValue(rawCycle as any)
    const result = await createCycle({
      title: 'Sprint 2026-W17',
      startDate: '2026-04-21',
      endDate: '2026-04-27',
    })
    expect(result.id).toBe('cycle-1')
  })
})
