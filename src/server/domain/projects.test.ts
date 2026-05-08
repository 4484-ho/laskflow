import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProject, updateProject, getProject, listProjects, deleteProject } from '@/server/domain/projects'

vi.mock('@/server/db/projects', () => ({
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))

import * as db from '@/server/db/projects'

describe('domain/projects', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createProject', () => {
    it('rejects lowercase prefix', async () => {
      await expect(createProject({ title: 't', prefix: 'lower' })).rejects.toThrow(/prefix|uppercase/i)
      expect(db.createProject).not.toHaveBeenCalled()
    })

    it('rejects empty title', async () => {
      await expect(createProject({ title: '', prefix: 'PRJ' })).rejects.toThrow(/title|string/i)
      expect(db.createProject).not.toHaveBeenCalled()
    })

    it('passes validated input to db', async () => {
      ;(db.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p1', title: 'P', prefix: 'PRJ' })
      await createProject({ title: 'P', prefix: 'PRJ' })
      expect(db.createProject).toHaveBeenCalledWith(expect.objectContaining({ title: 'P', prefix: 'PRJ' }))
    })
  })

  describe('updateProject', () => {
    it('rejects invalid status', async () => {
      await expect(updateProject('p1', { status: 'bogus' as never })).rejects.toThrow(/invalid_enum_value|status/i)
      expect(db.updateProject).not.toHaveBeenCalled()
    })

    it('passes validated update to db', async () => {
      ;(db.updateProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p1' })
      await updateProject('p1', { status: 'paused' })
      expect(db.updateProject).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'paused' }))
    })
  })

  describe('getProject', () => {
    it('delegates to db.getProject', async () => {
      ;(db.getProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p1' })
      expect(await getProject('p1')).toEqual({ id: 'p1' })
    })

    it('returns null when not found', async () => {
      ;(db.getProject as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      expect(await getProject('x')).toBeNull()
    })
  })

  describe('listProjects', () => {
    it('delegates to db.getProjects', async () => {
      ;(db.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await listProjects()
      expect(db.getProjects).toHaveBeenCalled()
    })
  })

  describe('deleteProject', () => {
    it('delegates to db.deleteProject', async () => {
      ;(db.deleteProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      await deleteProject('p1')
      expect(db.deleteProject).toHaveBeenCalledWith('p1')
    })
  })
})
