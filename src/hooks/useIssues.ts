'use client'

import { z } from 'zod'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { issueListQuerySchema } from '@/lib/schemas'
import type { Issue, CreateIssueInput, UpdateIssueInput } from '@/types'

type IssueFilters = z.input<typeof issueListQuerySchema>

async function fetchIssues(filters: IssueFilters): Promise<Issue[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v) qs.set(k, v)
  }
  const res = await fetch(`/api/issues${qs.size ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.status}`)
  return res.json()
}

async function fetchIssue(id: string): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch issue: ${res.status}`)
  return res.json()
}

async function postIssue(data: CreateIssueInput): Promise<Issue> {
  const res = await fetch('/api/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create issue: ${res.status}`)
  return res.json()
}

async function patchIssue(id: string, data: UpdateIssueInput): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update issue: ${res.status}`)
  return res.json()
}

async function deleteIssueRequest(id: string): Promise<void> {
  const res = await fetch(`/api/issues/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete issue: ${res.status}`)
}

async function postMoveIssue(id: string, body: { beforeId: string | null; afterId: string | null }): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Failed to move issue: ${res.status}`)
  return res.json()
}

export function useIssues(filters: IssueFilters = {}) {
  return useQuery({
    queryKey: queryKeys.issues.list(filters),
    queryFn: () => fetchIssues(filters),
  })
}

export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.issues.detail(id) : ['issues', 'detail', 'disabled'],
    queryFn: () => fetchIssue(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postIssue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}

export function useUpdateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIssueInput }) =>
      patchIssue(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.issues.all })
      const previous = qc.getQueriesData<Issue[]>({ queryKey: queryKeys.issues.all })
      // setQueriesData matches both list and detail caches under queryKeys.issues.all.
      // Array.isArray guard ensures detail entries (single Issue) are skipped safely.
      // Detail cache optimistic update is deferred to Phase 2b (slideover implementation).
      qc.setQueriesData<Issue[]>(
        { queryKey: queryKeys.issues.all },
        (old) =>
          Array.isArray(old)
            ? old.map((i) => (i.id === id ? { ...i, ...(data as Partial<Issue>) } : i))
            : old,
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}

export function useDeleteIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteIssueRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}

export function useMoveIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, beforeId, afterId }: { id: string; beforeId: string | null; afterId: string | null }) =>
      postMoveIssue(id, { beforeId, afterId }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.issues.all })
      const previous = qc.getQueriesData<Issue[]>({ queryKey: queryKeys.issues.all })
      // 楽観的に即時並べ替えるロジックは Phase 2b の D&D 実装と一緒に追加。
      // Phase 2a では invalidate のみで十分。
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}
