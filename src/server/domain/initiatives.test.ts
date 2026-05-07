import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInitiative, updateInitiative, getInitiative, listInitiatives, deleteInitiative } from '@/server/domain/initiatives'

vi.mock('@/server/db/initiatives', () => ({
  getInitiatives: vi.fn(),
  getInitiative: vi.fn(),
  createInitiative: vi.fn(),
  updateInitiative: vi.fn(),
  deleteInitiative: vi.fn(),
}))

import * as db from '@/server/db/initiatives'

describe('domain/initiatives', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createInitiative', () => {
    it('rejects empty title', async () => {
      await expect(createInitiative({ title: '' })).rejects.toThrow(/title|string/i)
      expect(db.createInitiative).not.toHaveBeenCalled()
    })

    it('passes validated input to db', async () => {
      ;(db.createInitiative as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'i1' })
      await createInitiative({ title: 'I' })
      expect(db.createInitiative).toHaveBeenCalledWith(expect.objectContaining({ title: 'I' }))
    })

    it('passes optional color to db', async () => {
      ;(db.createInitiative as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'i1', color: '#FF0000' })
      await createInitiative({ title: 'I', color: '#FF0000' })
      expect(db.createInitiative).toHaveBeenCalledWith(expect.objectContaining({ title: 'I', color: '#FF0000' }))
    })
  })

  describe('updateInitiative', () => {
    it('rejects invalid status', async () => {
      await expect(updateInitiative('i1', { status: 'bogus' as never })).rejects.toThrow(/invalid_enum_value|status/i)
      expect(db.updateInitiative).not.toHaveBeenCalled()
    })

    it('passes validated update to db', async () => {
      ;(db.updateInitiative as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'i1' })
      await updateInitiative('i1', { status: 'completed' })
      expect(db.updateInitiative).toHaveBeenCalledWith('i1', expect.objectContaining({ status: 'completed' }))
    })
  })

  describe('getInitiative', () => {
    it('delegates to db', async () => {
      ;(db.getInitiative as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'i1' })
      expect(await getInitiative('i1')).toEqual({ id: 'i1' })
    })

    it('returns null when not found', async () => {
      ;(db.getInitiative as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      expect(await getInitiative('x')).toBeNull()
    })
  })

  describe('listInitiatives', () => {
    it('delegates to db.getInitiatives', async () => {
      ;(db.getInitiatives as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await listInitiatives()
      expect(db.getInitiatives).toHaveBeenCalled()
    })
  })

  describe('deleteInitiative', () => {
    it('delegates to db.deleteInitiative', async () => {
      ;(db.deleteInitiative as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      await deleteInitiative('i1')
      expect(db.deleteInitiative).toHaveBeenCalledWith('i1')
    })
  })
})
