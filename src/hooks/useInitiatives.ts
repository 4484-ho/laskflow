'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Initiative } from '@/types'

async function fetchInitiatives(): Promise<Initiative[]> {
  const res = await fetch('/api/initiatives')
  if (!res.ok) throw new Error(`Failed to fetch initiatives: ${res.status}`)
  return res.json()
}

export function useInitiatives() {
  return useQuery({
    queryKey: queryKeys.initiatives.list(),
    queryFn: fetchInitiatives,
  })
}
