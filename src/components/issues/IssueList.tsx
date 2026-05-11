'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { IssueRow } from './IssueRow'
import { useMoveIssue } from '@/hooks/useIssues'
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

function StatusGroup({
  status,
  issues,
  onIssueClick,
}: {
  status: IssueStatus
  issues: Issue[]
  onIssueClick?: (id: string) => void
}) {
  const { mutate: moveIssue } = useMoveIssue()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = issues.findIndex((i) => i.id === active.id)
    const newIndex = issues.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(issues, oldIndex, newIndex)

    const beforeId = newIndex > 0 ? reordered[newIndex - 1].id : null
    const afterId = newIndex < reordered.length - 1 ? reordered[newIndex + 1].id : null
    moveIssue({ id: active.id as string, beforeId, afterId })
  }

  return (
    <section>
      <div className="flex items-center gap-2 px-4 py-1 text-xs text-neutral-500 font-medium">
        <span>{STATUS_LABELS[status]}</span>
        <span className="text-neutral-700">{issues.length}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div>
            {issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick?.(issue.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  )
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
        return <StatusGroup key={status} status={status} issues={group} onIssueClick={onIssueClick} />
      })}
    </div>
  )
}
