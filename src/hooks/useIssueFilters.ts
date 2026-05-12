'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { IssueStatus } from '@/types'

export interface IssueFilters {
  status?: IssueStatus
  projectId?: string
  cycleId?: string
  initiativeId?: string
  sort?: 'sortOrder' | 'priority' | 'createdAt' | 'updatedAt'
}

export function useIssueFilters(): [IssueFilters, (patch: Partial<IssueFilters>) => void] {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters: IssueFilters = {
    status: (searchParams.get('status') as IssueStatus) || undefined,
    projectId: searchParams.get('projectId') || undefined,
    cycleId: searchParams.get('cycleId') || undefined,
    initiativeId: searchParams.get('initiativeId') || undefined,
    sort: (searchParams.get('sort') as IssueFilters['sort']) || undefined,
  }

  const setFilters = useCallback(
    (patch: Partial<IssueFilters>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v) params.set(k, v)
        else params.delete(k)
      }
      router.replace(`/issues?${params.toString()}`)
    },
    [router, searchParams],
  )

  return [filters, setFilters]
}
