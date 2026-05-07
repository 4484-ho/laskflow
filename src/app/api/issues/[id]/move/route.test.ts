import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/server/domain/issues', () => ({
  moveIssue: vi.fn(),
}))

import * as domain from '@/server/domain/issues'

const mockIssue = {
  id: 'issue-1',
  title: 'Test Issue',
  projectId: 'project-1',
  status: 'todo',
  priority: 'medium',
  sortOrder: 'a1',
}

function makeRequest(body: unknown, id = 'issue-1') {
  return new NextRequest(`http://localhost/api/issues/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/issues/[id]/move', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with updated issue on success', async () => {
    ;(domain.moveIssue as ReturnType<typeof vi.fn>).mockResolvedValue(mockIssue)

    const req = makeRequest({ beforeId: 'issue-0', afterId: 'issue-2' })
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(mockIssue)
    expect(domain.moveIssue).toHaveBeenCalledWith('issue-1', {
      beforeId: 'issue-0',
      afterId: 'issue-2',
    })
  })

  it('returns 200 when beforeId and afterId are null', async () => {
    ;(domain.moveIssue as ReturnType<typeof vi.fn>).mockResolvedValue(mockIssue)

    const req = makeRequest({ beforeId: null, afterId: null })
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(200)
    expect(domain.moveIssue).toHaveBeenCalledWith('issue-1', {
      beforeId: null,
      afterId: null,
    })
  })

  it('returns 200 when beforeId and afterId are omitted (undefined)', async () => {
    ;(domain.moveIssue as ReturnType<typeof vi.fn>).mockResolvedValue(mockIssue)

    const req = makeRequest({})
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(200)
    expect(domain.moveIssue).toHaveBeenCalledWith('issue-1', {
      beforeId: null,
      afterId: null,
    })
  })

  it('returns 400 for invalid body (extra required field with wrong type)', async () => {
    const req = makeRequest({ beforeId: 123 }) // number instead of string
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(domain.moveIssue).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/issues/issue-1/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(domain.moveIssue).not.toHaveBeenCalled()
  })

  it('returns 404 when moveIssue throws a not-found error (beforeId)', async () => {
    ;(domain.moveIssue as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('moveIssue: beforeId "issue-0" not found'),
    )

    const req = makeRequest({ beforeId: 'issue-0', afterId: null })
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('returns 404 when moveIssue throws a not-found error (afterId)', async () => {
    ;(domain.moveIssue as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('moveIssue: afterId "issue-2" not found'),
    )

    const req = makeRequest({ beforeId: null, afterId: 'issue-2' })
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  it('returns 500 on unexpected error', async () => {
    ;(domain.moveIssue as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Database connection lost'),
    )

    const req = makeRequest({ beforeId: null, afterId: null })
    const res = await POST(req, { params: Promise.resolve({ id: 'issue-1' }) })

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })
})
