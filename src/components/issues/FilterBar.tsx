'use client'

import { useProjects } from '@/hooks/useProjects'
import { useCycles } from '@/hooks/useCycles'
import { useInitiatives } from '@/hooks/useInitiatives'
import type { IssueFilters } from '@/hooks/useIssueFilters'
import type { IssueStatus } from '@/types'

const STATUS_OPTIONS: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']

interface FilterBarProps {
  filters: IssueFilters
  onChange: (patch: Partial<IssueFilters>) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { data: projects = [] } = useProjects()
  const { data: cycles = [] } = useCycles()
  const { data: initiatives = [] } = useInitiatives()

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 flex-wrap bg-white">
      <Select
        value={filters.status ?? ''}
        onChange={(v) => onChange({ status: (v as IssueStatus) || undefined })}
        label="Status"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>

      <Select
        value={filters.projectId ?? ''}
        onChange={(v) => onChange({ projectId: v || undefined })}
        label="Project"
      >
        <option value="">All projects</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </Select>

      <Select
        value={filters.cycleId ?? ''}
        onChange={(v) => onChange({ cycleId: v || undefined })}
        label="Cycle"
      >
        <option value="">All cycles</option>
        {cycles.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </Select>

      <Select
        value={filters.initiativeId ?? ''}
        onChange={(v) => onChange({ initiativeId: v || undefined })}
        label="Initiative"
      >
        <option value="">All initiatives</option>
        {initiatives.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
      </Select>

      <Select
        value={filters.sort ?? 'sortOrder'}
        onChange={(v) => onChange({ sort: (v as IssueFilters['sort']) || undefined })}
        label="Sort"
      >
        <option value="sortOrder">Manual order</option>
        <option value="priority">Priority</option>
        <option value="createdAt">Created</option>
        <option value="updatedAt">Updated</option>
      </Select>

      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => onChange({ status: undefined, projectId: undefined, cycleId: undefined, initiativeId: undefined, sort: undefined })}
          className="text-xs text-neutral-500 hover:text-neutral-900"
        >
          Clear
        </button>
      )}
    </div>
  )
}

function Select({
  value, onChange, label, children,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="bg-white text-neutral-900 text-xs rounded px-2 py-1 border border-neutral-300"
    >
      {children}
    </select>
  )
}
