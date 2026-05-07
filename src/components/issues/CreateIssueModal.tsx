'use client'

import { useState, useEffect } from 'react'
import { useCreateIssue } from '@/hooks/useIssues'
import { useUiStore } from '@/stores/uiStore'
import type { IssuePriority } from '@/types'

interface Project {
  id: string
  title: string
  prefix: string
}

export function CreateIssueModal() {
  const { isCreateIssueModalOpen, closeCreateIssueModal } = useUiStore()
  if (!isCreateIssueModalOpen) return null
  return <CreateIssueForm onClose={closeCreateIssueModal} />
}

function CreateIssueForm({ onClose }: { onClose: () => void }) {
  const createIssueMutation = useCreateIssue()

  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('none')
  const [projects, setProjects] = useState<Project[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: Project[]) => {
        setProjects(data)
        if (data.length > 0) setProjectId(data[0].id)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !projectId) return
    setSubmitting(true)
    try {
      await createIssueMutation.mutateAsync({ title: title.trim(), projectId, priority })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-lg p-5 shadow-2xl">
        <h2 className="text-sm font-medium text-neutral-200 mb-4">New Issue</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />

          <div className="flex gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prefix} — {p.title}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as IssuePriority)}
              className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
            >
              <option value="none">No priority</option>
              <option value="urgent">⚡ Urgent</option>
              <option value="high">▲ High</option>
              <option value="medium">■ Medium</option>
              <option value="low">▽ Low</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-md text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !projectId || submitting}
              className="px-4 py-1.5 rounded-md text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
