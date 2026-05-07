import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createIssue,
  updateIssue,
  getIssue,
  listIssues,
  deleteIssue,
} from '@/server/domain/issues'

vi.mock('@/server/db/issues', () => ({
  getIssues: vi.fn(),
  getIssue: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
}))

import * as db from '@/server/db/issues'

describe('domain/issues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createIssue', () => {
    it('rejects invalid input (missing title)', async () => {
      await expect(
        createIssue({ projectId: 'p1' } as never),
      ).rejects.toThrow()
      expect(db.createIssue).not.toHaveBeenCalled()
    })

    it('rejects invalid status', async () => {
      await expect(
        createIssue({ title: 't', projectId: 'p1', status: 'bogus' as never }),
      ).rejects.toThrow()
      expect(db.createIssue).not.toHaveBeenCalled()
    })

    it('passes validated input to db', async () => {
      ;(db.createIssue as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'i1', title: 'hello', projectId: 'p1' })
      await createIssue({ title: 'hello', projectId: 'p1' })
      expect(db.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'hello', projectId: 'p1' }),
      )
    })
  })

  describe('updateIssue', () => {
    it('rejects negative estimate', async () => {
      await expect(updateIssue('i1', { estimate: -1 })).rejects.toThrow()
      expect(db.updateIssue).not.toHaveBeenCalled()
    })

    it('passes valid update to db', async () => {
      ;(db.updateIssue as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'i1', status: 'backlog' })
      await updateIssue('i1', { status: 'done' })
      expect(db.updateIssue).toHaveBeenCalledWith('i1', expect.objectContaining({ status: 'done' }))
    })
  })

  describe('getIssue', () => {
    it('delegates to db.getIssue', async () => {
      ;(db.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'i1' })
      const result = await getIssue('i1')
      expect(result).toEqual({ id: 'i1' })
      expect(db.getIssue).toHaveBeenCalledWith('i1')
    })

    it('returns null when not found', async () => {
      ;(db.getIssue as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      expect(await getIssue('missing')).toBeNull()
    })
  })

  describe('listIssues', () => {
    it('rejects invalid status filter', async () => {
      await expect(listIssues({ status: 'bogus' as never })).rejects.toThrow()
      expect(db.getIssues).not.toHaveBeenCalled()
    })

    it('passes validated params to db', async () => {
      ;(db.getIssues as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await listIssues({ status: 'todo' })
      expect(db.getIssues).toHaveBeenCalledWith(expect.objectContaining({ status: 'todo' }))
    })
  })

  describe('deleteIssue', () => {
    it('delegates to db.deleteIssue', async () => {
      ;(db.deleteIssue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      await deleteIssue('i1')
      expect(db.deleteIssue).toHaveBeenCalledWith('i1')
    })
  })
})
