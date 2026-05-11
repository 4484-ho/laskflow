'use client'

import { useUpdateIssue } from '@/hooks/useIssues'
import type { Issue, IssueStatus } from '@/types'

const STATUS_ICONS: Record<IssueStatus, { icon: string; label: string; next: IssueStatus }> = {
  backlog:     { icon: '○', label: 'Backlog',      next: 'todo' },
  todo:        { icon: '◎', label: 'Todo',         next: 'in_progress' },
  in_progress: { icon: '◑', label: 'In Progress',  next: 'in_review' },
  in_review:   { icon: '◐', label: 'In Review',    next: 'done' },
  done:        { icon: '●', label: 'Done',          next: 'cancelled' },
  cancelled:   { icon: '⊘', label: 'Cancelled',    next: 'backlog' },
}

const PRIORITY_ICONS: Record<string, string> = {
  urgent: '⚡', high: '▲', medium: '■', low: '▽', none: '',
}

interface IssueRowProps {
  issue: Issue
  onClick?: () => void
}

export function IssueRow({ issue, onClick }: IssueRowProps) {
  const updateIssueMutation = useUpdateIssue()
  const statusInfo = STATUS_ICONS[issue.status]

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateIssueMutation.mutate({ id: issue.id, data: { status: statusInfo.next } })
  }

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      role="button"
      tabIndex={0}
      data-testid="issue-row"
      className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-900/50 group rounded-md cursor-pointer"
    >
      <button
        onClick={cycleStatus}
        title={`${statusInfo.label} → ${STATUS_ICONS[statusInfo.next].label}`}
        className="text-neutral-500 hover:text-neutral-200 transition-colors shrink-0 font-mono text-sm w-4"
      >
        {statusInfo.icon}
      </button>
      <span className="text-xs text-neutral-600 shrink-0 font-mono w-14">{issue.identifier}</span>
      <span className="flex-1 text-sm text-neutral-100 truncate">{issue.title}</span>
      {issue.priority !== 'none' && (
        <span className="text-xs text-neutral-500 shrink-0" title={issue.priority}>
          {PRIORITY_ICONS[issue.priority]}
        </span>
      )}
      {issue.children && issue.children.length > 0 && (
        <span className="text-xs text-neutral-600 shrink-0">
          {issue.children.filter((c) => c.status === 'done').length}/{issue.children.length}
        </span>
      )}
    </div>
  )
}
