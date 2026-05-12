'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIssue, useUpdateIssue } from '@/hooks/useIssues'
import type { Issue } from '@/types'
import { MetaSidebar } from './MetaSidebar'
import { DescriptionEditor } from './DescriptionEditor'
import { SubtaskSection } from './SubtaskSection'

interface IssueDetailSlideoverProps {
  issueId: string
  onClose: () => void
}

function IssueDetailPanel({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const [localTitle, setLocalTitle] = useState(issue.title)
  const { mutate: updateIssue } = useUpdateIssue()

  const saveTitle = () => {
    const val = localTitle.trim()
    if (val && val !== issue.title) {
      updateIssue({ id: issue.id, data: { title: val } })
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside aria-label="Issue detail" className="fixed right-0 top-0 bottom-0 z-50 w-[600px] flex flex-col border-l border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 shrink-0 bg-white">
          <span className="text-xs font-mono text-neutral-500">{issue.identifier}</span>
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="flex-1 bg-transparent text-sm font-medium text-neutral-900 outline-none"
          />
          <button onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-neutral-900">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-2">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Description</span>
            </div>
            <DescriptionEditor
              key={issue.id}
              initialValue={issue.description}
              onSave={(val) => updateIssue({ id: issue.id, data: { description: val } })}
            />
            <SubtaskSection parentIssue={issue} />
          </div>
          <MetaSidebar issue={issue} />
        </div>
      </aside>
    </>
  )
}

export function IssueDetailSlideover({ issueId, onClose }: IssueDetailSlideoverProps) {
  const { data: issue, isLoading } = useIssue(issueId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (isLoading || !issue) {
    return (
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-[600px] flex flex-col border-l border-neutral-200 bg-white shadow-2xl">
        <div className="p-4 text-sm text-neutral-500">Loading...</div>
      </aside>
    )
  }

  return <IssueDetailPanel key={issue.id} issue={issue} onClose={onClose} />
}
