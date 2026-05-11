'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useIssue, useUpdateIssue } from '@/hooks/useIssues'
import { MetaSidebar } from './MetaSidebar'

interface IssueDetailSlideoverProps {
  issueId: string
  onClose: () => void
}

export function IssueDetailSlideover({ issueId, onClose }: IssueDetailSlideoverProps) {
  const { data: issue, isLoading } = useIssue(issueId)
  const { mutate: updateIssue } = useUpdateIssue()
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (isLoading || !issue) {
    return (
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-[600px] flex flex-col border-l border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="p-4 text-sm text-neutral-500">Loading...</div>
      </aside>
    )
  }

  const saveTitle = () => {
    const val = titleRef.current?.value.trim()
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
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-[600px] flex flex-col border-l border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 shrink-0">
          <span className="text-xs font-mono text-neutral-500">{issue.identifier}</span>
          <input
            ref={titleRef}
            defaultValue={issue.title}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') titleRef.current?.blur() }}
            className="flex-1 bg-transparent text-sm font-medium text-neutral-100 outline-none"
          />
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-neutral-500 italic">Description editor (Task 4)</p>
          </div>
          <MetaSidebar issue={issue} />
        </div>
      </aside>
    </>
  )
}
