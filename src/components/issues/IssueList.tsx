import { IssueRow } from './IssueRow'
import type { Issue, IssueStatus } from '@/types'

const STATUS_ORDER: IssueStatus[] = [
  'in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled',
]

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress',
  in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
}

interface IssueListProps {
  issues: Issue[]
  onIssueClick?: (issueId: string) => void
}

export function IssueList({ issues, onIssueClick }: IssueListProps) {
  const grouped = STATUS_ORDER.reduce<Record<IssueStatus, Issue[]>>(
    (acc, status) => { acc[status] = issues.filter((i) => i.status === status); return acc },
    {} as Record<IssueStatus, Issue[]>,
  )

  return (
    <div className="flex flex-col gap-4">
      {STATUS_ORDER.map((status) => {
        const group = grouped[status]
        if (group.length === 0) return null
        return (
          <section key={status}>
            <div className="flex items-center gap-2 px-4 py-1 text-xs text-neutral-500 font-medium">
              <span>{STATUS_LABELS[status]}</span>
              <span className="text-neutral-700">{group.length}</span>
            </div>
            <div>
              {group.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  onClick={() => onIssueClick?.(issue.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
