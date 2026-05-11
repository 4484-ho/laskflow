'use client'

import type { Issue, Cycle } from '@/types'

interface CycleProgressPanelProps {
  cycle: Cycle
  issues: Issue[]
}

export function CycleProgressPanel({ cycle, issues }: CycleProgressPanelProps) {
  const total = issues.length
  const completed = issues.filter((i) => i.status === 'done').length
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  const now = new Date()
  const start = new Date(cycle.startDate)
  const end = new Date(cycle.endDate)
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000)
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / 86400000)
  const elapsedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100))

  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000)

  let barColor = 'bg-green-500'
  if (elapsedPct > percentage + 20) barColor = 'bg-red-500'
  else if (elapsedPct > percentage + 10) barColor = 'bg-yellow-500'

  return (
    <div className="rounded-lg border border-neutral-800 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-neutral-300">Progress</span>
        <span className="text-xs text-neutral-500">
          {daysRemaining > 0 ? `${daysRemaining}d remaining` : `${Math.abs(daysRemaining)}d overdue`}
        </span>
      </div>

      <div className="w-full bg-neutral-800 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{completed}/{total} issues completed</span>
        <span>{percentage}%</span>
      </div>
    </div>
  )
}
