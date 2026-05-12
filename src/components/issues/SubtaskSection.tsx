'use client'

import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useCreateIssue, useUpdateIssue } from '@/hooks/useIssues'
import type { Issue } from '@/types'

interface SubtaskSectionProps {
  parentIssue: Issue
}

export function SubtaskSection({ parentIssue }: SubtaskSectionProps) {
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: createIssue, isPending: isCreating } = useCreateIssue()
  const { mutate: updateIssue } = useUpdateIssue()

  const subtasks = parentIssue.children ?? []

  const handleCreate = () => {
    const title = inputRef.current?.value.trim()
    if (!title) { setCreating(false); return }
    if (inputRef.current) inputRef.current.value = ''
    createIssue(
      { title, projectId: parentIssue.projectId, parentId: parentIssue.id, status: 'todo' },
      { onSuccess: () => { setCreating(false) } },
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-neutral-500">Subtasks</span>
        <span className="text-xs text-neutral-600">{subtasks.length}</span>
      </div>

      <div className="flex flex-col gap-1">
        {subtasks.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={sub.status === 'done'}
              aria-label={`Mark "${sub.title}" as done`}
              onChange={(e) =>
                updateIssue({ id: sub.id, data: { status: e.target.checked ? 'done' : 'todo' } })
              }
              className="accent-teal-600 shrink-0"
            />
            <span className={`text-sm ${sub.status === 'done' ? 'line-through text-neutral-500' : 'text-neutral-900'}`}>
              {sub.title}
            </span>
          </div>
        ))}
      </div>

      {creating ? (
        <input
          ref={inputRef}
          autoFocus
          disabled={isCreating}
          placeholder="Subtask title..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
            if (e.key === 'Escape') setCreating(false)
          }}
          onBlur={handleCreate}
          className="mt-2 w-full bg-white text-neutral-900 text-sm rounded px-2 py-1 outline-none border border-neutral-300"
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-2 flex items-center gap-1 text-xs text-neutral-500 hover:text-teal-700"
        >
          <Plus size={12} /> Add subtask
        </button>
      )}
    </div>
  )
}
