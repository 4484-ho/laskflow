'use client'

import { useInitiatives } from '@/hooks/useInitiatives'
import { InitiativeList } from '@/components/initiatives/InitiativeList'
import { Topbar } from '@/components/layout/Topbar'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function InitiativesPageClient() {
  const { data: initiatives = [], isLoading, isError } = useInitiatives()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.initiatives.all })

  return (
    <>
      <Topbar title="Initiatives" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Initiatives</h1>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Failed to load initiatives.</p>
          ) : (
            <InitiativeList initiatives={initiatives} onCreated={refresh} />
          )}
        </div>
      </div>
    </>
  )
}
