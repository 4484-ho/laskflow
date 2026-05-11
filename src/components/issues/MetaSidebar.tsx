'use client'

import { useProjects } from '@/hooks/useProjects'
import { useCycles } from '@/hooks/useCycles'
import { useUpdateIssue } from '@/hooks/useIssues'
import type { Issue, IssueStatus, IssuePriority } from '@/types'

const STATUS_OPTIONS: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']
const PRIORITY_OPTIONS: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none']

interface MetaSidebarProps {
  issue: Issue
}

export function MetaSidebar({ issue }: MetaSidebarProps) {
  const { mutate: updateIssue } = useUpdateIssue()
  const { data: projects = [] } = useProjects()
  const { data: cycles = [] } = useCycles()

  const update = (data: Parameters<typeof updateIssue>[0]['data']) =>
    updateIssue({ id: issue.id, data })

  return (
    <div className="w-48 shrink-0 border-l border-neutral-800 p-4 flex flex-col gap-4 bg-neutral-950">
      <Field label="Status">
        <select
          value={issue.status}
          onChange={(e) => update({ status: e.target.value as IssueStatus })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>

      <Field label="Priority">
        <select
          value={issue.priority}
          onChange={(e) => update({ priority: e.target.value as IssuePriority })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Field>

      <Field label="Project">
        <select
          value={issue.projectId}
          onChange={(e) => update({ projectId: e.target.value })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </Field>

      <Field label="Cycle">
        <select
          value={issue.cycleId ?? ''}
          onChange={(e) => update({ cycleId: e.target.value || null })}
          className="w-full bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 border border-neutral-700"
        >
          <option value="">No cycle</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </Field>

      {issue.dueDate && (
        <Field label="Due">
          <span className="text-xs text-neutral-400">
            {new Date(issue.dueDate).toLocaleDateString()}
          </span>
        </Field>
      )}

      <Field label="Created">
        <span className="text-xs text-neutral-500">
          {new Date(issue.createdAt).toLocaleDateString()}
        </span>
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      {children}
    </div>
  )
}
