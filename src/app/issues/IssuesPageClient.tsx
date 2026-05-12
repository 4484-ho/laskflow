'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useIssues } from '@/hooks/useIssues'
import { useUiStore } from '@/stores/uiStore'
import { IssueList } from '@/components/issues/IssueList'
import { IssueDetailSlideover } from '@/components/issues/IssueDetailSlideover'
import { CreateIssueModal } from '@/components/issues/CreateIssueModal'
import { FilterBar } from '@/components/issues/FilterBar'
import { Topbar } from '@/components/layout/Topbar'
import { useIssueFilters } from '@/hooks/useIssueFilters'
import { Plus } from 'lucide-react'

export function IssuesPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected') ?? undefined

  const [filters, setFilters] = useIssueFilters()
  const { data: issues, isLoading, isError } = useIssues(filters)
  const { openCreateIssueModal } = useUiStore()

  const openIssue = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('selected', id)
    router.push(`/issues?${params.toString()}`)
  }, [router, searchParams])

  const closeIssue = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('selected')
    router.push(`/issues?${params.toString()}`)
  }, [router, searchParams])

  return (
    <>
      <Topbar title="Issues" />
      <FilterBar filters={filters} onChange={setFilters} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6">
            <div className="flex items-center justify-between px-4 mb-4">
              <h1 className="text-sm font-medium text-neutral-900">All Issues</h1>
              <button
                onClick={openCreateIssueModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-sm text-white transition-colors"
              >
                <Plus size={14} />
                New Issue
              </button>
            </div>

            {isLoading ? (
              <p className="px-4 text-sm text-neutral-500">Loading...</p>
            ) : isError ? (
              <p className="px-4 text-sm text-red-500">Failed to load issues.</p>
            ) : !issues || issues.length === 0 ? (
              <p className="px-4 text-sm text-neutral-500">No issues yet.</p>
            ) : (
              <IssueList issues={issues} onIssueClick={openIssue} />
            )}
          </div>
        </div>

        {selectedId && (
          <IssueDetailSlideover issueId={selectedId} onClose={closeIssue} />
        )}
      </div>
      <CreateIssueModal />
    </>
  )
}
