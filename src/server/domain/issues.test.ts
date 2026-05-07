import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createIssue,
  updateIssue,
  getIssue,
  listIssues,
  deleteIssue,
  moveIssue,   // NEW
} from '@/server/domain/issues'

vi.mock('@/server/db/issues', () => ({
  getIssues: vi.fn(),
  getIssue: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  updateSortOrder: vi.fn(),  // NEW
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
      ).rejects.toThrow(/title/i)
      expect(db.createIssue).not.toHaveBeenCalled()
    })

    it('rejects invalid status', async () => {
      await expect(
        createIssue({ title: 't', projectId: 'p1', status: 'bogus' as never }),
      ).rejects.toThrow(/invalid_enum_value|status/i)
      expect(db.createIssue).not.toHaveBeenCalled()
    })

    it('passes validated input to db', async () => {
      ;(db.getIssues as ReturnType<typeof vi.fn>).mockResolvedValue([])
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
      await expect(listIssues({ status: 'bogus' as never })).rejects.toThrow(/invalid_enum_value|status/i)
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

describe('domain/issues — sortOrder on create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('assigns a key after the last existing issue in the same project', async () => {
    ;(db.getIssues as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'i0', sortOrder: 'a0', projectId: 'p1' },
    ])
    ;(db.createIssue as ReturnType<typeof vi.fn>).mockImplementation(
      (arg: { sortOrder: string }) => ({ id: 'i1', ...arg }),
    )
    await createIssue({ title: 't', projectId: 'p1' })
    const call = (db.createIssue as ReturnType<typeof vi.fn>).mock.calls[0][0] as { sortOrder: string }
    expect(call.sortOrder > 'a0').toBe(true)
  })

  it('assigns an initial key when no issues exist', async () => {
    ;(db.getIssues as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(db.createIssue as ReturnType<typeof vi.fn>).mockImplementation(
      (arg: { sortOrder: string }) => ({ id: 'i1', ...arg }),
    )
    await createIssue({ title: 't', projectId: 'p1' })
    const call = (db.createIssue as ReturnType<typeof vi.fn>).mock.calls[0][0] as { sortOrder: string }
    expect(typeof call.sortOrder).toBe('string')
    expect(call.sortOrder.length).toBeGreaterThan(0)
    // Must not be the old Date.now() placeholder format (numeric string)
    expect(isNaN(Number(call.sortOrder))).toBe(true)
  })
})

describe('domain/issues — moveIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('moves an issue between two others', async () => {
    ;(db.getIssue as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
      const map: Record<string, { id: string; sortOrder: string }> = {
        before: { id: 'before', sortOrder: 'a0' },
        after: { id: 'after', sortOrder: 'a2' },
        target: { id: 'target', sortOrder: 'a5' },
      }
      return Promise.resolve(map[id] ?? null)
    })
    ;(db.updateSortOrder as ReturnType<typeof vi.fn>).mockImplementation(
      (id: string, sortOrder: string) => Promise.resolve({ id, sortOrder }),
    )
    await moveIssue('target', { beforeId: 'before', afterId: 'after' })
    const [, newKey] = (db.updateSortOrder as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    expect(newKey > 'a0').toBe(true)
    expect(newKey < 'a2').toBe(true)
  })

  it('moves to end when afterId is null', async () => {
    ;(db.getIssue as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
      const map: Record<string, { id: string; sortOrder: string }> = {
        before: { id: 'before', sortOrder: 'a5' },
        target: { id: 'target', sortOrder: 'a0' },
      }
      return Promise.resolve(map[id] ?? null)
    })
    ;(db.updateSortOrder as ReturnType<typeof vi.fn>).mockImplementation(
      (id: string, sortOrder: string) => Promise.resolve({ id, sortOrder }),
    )
    await moveIssue('target', { beforeId: 'before', afterId: null })
    const [, newKey] = (db.updateSortOrder as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    expect(newKey > 'a5').toBe(true)
  })

  it('moves to beginning when beforeId is null', async () => {
    ;(db.getIssue as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
      const map: Record<string, { id: string; sortOrder: string }> = {
        after: { id: 'after', sortOrder: 'a3' },
        target: { id: 'target', sortOrder: 'a9' },
      }
      return Promise.resolve(map[id] ?? null)
    })
    ;(db.updateSortOrder as ReturnType<typeof vi.fn>).mockImplementation(
      (id: string, sortOrder: string) => Promise.resolve({ id, sortOrder }),
    )
    await moveIssue('target', { beforeId: null, afterId: 'after' })
    const [, newKey] = (db.updateSortOrder as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    expect(newKey < 'a3').toBe(true)
  })

  it('rejects when beforeKey >= afterKey', async () => {
    ;(db.getIssue as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'before', sortOrder: 'a5' })
      .mockResolvedValueOnce({ id: 'after', sortOrder: 'a1' })
    await expect(
      moveIssue('target', { beforeId: 'before', afterId: 'after' }),
    ).rejects.toThrow(/before.*after|sort key/i)
  })

  it('rejects when beforeId is not found', async () => {
    ;(db.getIssue as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    await expect(
      moveIssue('target', { beforeId: 'missing-before', afterId: null }),
    ).rejects.toThrow(/beforeId.*not found/i)
  })

  it('rejects when afterId is not found', async () => {
    ;(db.getIssue as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    await expect(
      moveIssue('target', { beforeId: null, afterId: 'missing-after' }),
    ).rejects.toThrow(/afterId.*not found/i)
  })
})
