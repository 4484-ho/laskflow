'use client'
import { useEffect, useState, useCallback } from 'react'
import { InitiativeList } from '@/components/initiatives/InitiativeList'
import { Topbar } from '@/components/layout/Topbar'
import type { Initiative } from '@/types'

export default function InitiativesPage() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const load = useCallback(() => setRefreshKey((k) => k + 1), [])
  // TODO(Phase 2b): migrate to TanStack Query (useProjects/useInitiatives/useCycles hooks)
  // and add error handling consistent with IssuesPageClient.
  useEffect(() => {
    fetch('/api/initiatives')
      .then((r) => r.json())
      .then(setInitiatives)
  }, [refreshKey])
  return (
    <>
      <Topbar title="Initiatives" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Initiatives</h1>
          <InitiativeList initiatives={initiatives} onCreated={load} />
        </div>
      </div>
    </>
  )
}
