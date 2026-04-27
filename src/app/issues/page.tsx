'use client'

import { useEffect } from 'react'
import { useIssueStore } from '@/stores/issueStore'
import { useUiStore } from '@/stores/uiStore'
import { IssueList } from '@/components/issues/IssueList'
import { CreateIssueModal } from '@/components/issues/CreateIssueModal'
import { Topbar } from '@/components/layout/Topbar'
import { Plus } from 'lucide-react'

export default function IssuesPage() {
  const { issues, loading, fetchIssues } = useIssueStore()
  const { openCreateIssueModal } = useUiStore()

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  return (
    <>
      <Topbar title="Issues" />
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

          {loading ? (
            <p className="px-4 text-sm text-neutral-500">Loading...</p>
          ) : issues.length === 0 ? (
            <p className="px-4 text-sm text-neutral-500">No issues yet.</p>
          ) : (
            <IssueList issues={issues} />
          )}
        </div>
      </div>
      <CreateIssueModal />
    </>
  )
}
