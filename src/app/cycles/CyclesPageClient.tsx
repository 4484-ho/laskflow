'use client'

import { useCycles } from '@/hooks/useCycles'
import { CycleList } from '@/components/cycles/CycleList'
import { Topbar } from '@/components/layout/Topbar'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function CyclesPageClient() {
  const { data: cycles = [], isLoading, isError } = useCycles()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.cycles.all })

  return (
    <>
      <Topbar title="Cycles" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-900 mb-4">Cycles</h1>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Failed to load cycles.</p>
          ) : (
            <CycleList cycles={cycles} onCreated={refresh} />
          )}
        </div>
      </div>
    </>
  )
}
