'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Cycle } from '@/types'

async function fetchCycles(): Promise<Cycle[]> {
  const res = await fetch('/api/cycles')
  if (!res.ok) throw new Error(`Failed to fetch cycles: ${res.status}`)
  return res.json()
}

export function useCycles() {
  return useQuery({
    queryKey: queryKeys.cycles.list(),
    queryFn: fetchCycles,
  })
}
