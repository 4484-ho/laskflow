import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCycle, updateCycle, getCycle, listCycles, deleteCycle } from '@/server/domain/cycles'

vi.mock('@/server/db/cycles', () => ({
  getCycles: vi.fn(),
  getCycle: vi.fn(),
  createCycle: vi.fn(),
  updateCycle: vi.fn(),
  deleteCycle: vi.fn(),
}))

import * as db from '@/server/db/cycles'

describe('domain/cycles', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createCycle', () => {
    it('rejects missing endDate', async () => {
      await expect(createCycle({ title: 'C', startDate: '2026-05-01' } as never)).rejects.toThrow()
      expect(db.createCycle).not.toHaveBeenCalled()
    })

    it('passes validated input to db', async () => {
      ;(db.createCycle as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' })
      await createCycle({ title: 'C', startDate: '2026-05-01', endDate: '2026-05-15' })
      expect(db.createCycle).toHaveBeenCalledWith(expect.objectContaining({ title: 'C' }))
    })
  })

  describe('updateCycle', () => {
    it('rejects invalid status', async () => {
      await expect(updateCycle('c1', { status: 'bogus' as never })).rejects.toThrow(/invalid_enum_value|status/i)
      expect(db.updateCycle).not.toHaveBeenCalled()
    })
  })

  describe('getCycle', () => {
    it('delegates to db', async () => {
      ;(db.getCycle as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' })
      expect(await getCycle('c1')).toEqual({ id: 'c1' })
    })
  })

  describe('listCycles', () => {
    it('delegates to db.getCycles', async () => {
      ;(db.getCycles as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await listCycles()
      expect(db.getCycles).toHaveBeenCalled()
    })
  })

  describe('deleteCycle', () => {
    it('delegates to db.deleteCycle', async () => {
      ;(db.deleteCycle as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      await deleteCycle('c1')
      expect(db.deleteCycle).toHaveBeenCalledWith('c1')
    })
  })
})
