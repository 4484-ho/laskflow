'use client'
import { useEffect, useState, useCallback } from 'react'
import { CycleList } from '@/components/cycles/CycleList'
import { Topbar } from '@/components/layout/Topbar'
import type { Cycle } from '@/types'

export default function CyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const load = useCallback(() => setRefreshKey((k) => k + 1), [])
  // TODO(Phase 2b): migrate to TanStack Query (useProjects/useInitiatives/useCycles hooks)
  // and add error handling consistent with IssuesPageClient.
  useEffect(() => {
    fetch('/api/cycles')
      .then((r) => r.json())
      .then(setCycles)
  }, [refreshKey])
  return (
    <>
      <Topbar title="Cycles" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Cycles</h1>
          <CycleList cycles={cycles} onCreated={load} />
        </div>
      </div>
    </>
  )
}
