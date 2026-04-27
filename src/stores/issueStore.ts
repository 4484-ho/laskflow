import { create } from 'zustand'
import type { Issue, CreateIssueInput, UpdateIssueInput } from '@/types'

interface IssueStore {
  issues: Issue[]
  loading: boolean
  fetchIssues: (params?: Record<string, string>) => Promise<void>
  createIssue: (data: CreateIssueInput) => Promise<Issue>
  updateIssue: (id: string, data: UpdateIssueInput) => Promise<void>
  deleteIssue: (id: string) => Promise<void>
}

export const useIssueStore = create<IssueStore>((set) => ({
  issues: [],
  loading: false,

  fetchIssues: async (params = {}) => {
    set({ loading: true })
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`/api/issues${query ? `?${query}` : ''}`)
    const issues: Issue[] = await res.json()
    set({ issues, loading: false })
  },

  createIssue: async (data) => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const issue: Issue = await res.json()
    set((s) => ({ issues: [...s.issues, issue] }))
    return issue
  },

  updateIssue: async (id, data) => {
    const res = await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated: Issue = await res.json()
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? updated : i)) }))
  },

  deleteIssue: async (id) => {
    await fetch(`/api/issues/${id}`, { method: 'DELETE' })
    set((s) => ({ issues: s.issues.filter((i) => i.id !== id) }))
  },
}))
