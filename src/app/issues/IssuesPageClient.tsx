'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useIssues } from '@/hooks/useIssues'
import { useUiStore } from '@/stores/uiStore'
import { IssueList } from '@/components/issues/IssueList'
import { IssueDetailSlideover } from '@/components/issues/IssueDetailSlideover'
import { CreateIssueModal } from '@/components/issues/CreateIssueModal'
import { Topbar } from '@/components/layout/Topbar'
import { Plus } from 'lucide-react'

export function IssuesPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected') ?? undefined

  const { data: issues, isLoading, isError } = useIssues()
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
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6">
            <div className="flex items-center justify-between px-4 mb-4">
              <h1 className="text-sm font-medium text-neutral-200">All Issues</h1>
              <button
                onClick={openCreateIssueModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-200 transition-colors"
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
