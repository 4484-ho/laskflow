'use client'

import { Topbar } from '@/components/layout/Topbar'
import type { Initiative } from '@/types'

interface InitiativeDetailClientProps {
  initiative: Initiative
}

export function InitiativeDetailClient({ initiative }: InitiativeDetailClientProps) {
  return (
    <>
      <Topbar title={initiative.title} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <h1 className="text-lg font-semibold text-neutral-100 mb-2">{initiative.title}</h1>
          {initiative.description && (
            <p className="text-sm text-neutral-400 mb-6">{initiative.description}</p>
          )}
          <div className="flex gap-4 text-xs text-neutral-500">
            <span>Status: {initiative.status}</span>
            {initiative.startDate && (
              <span>Start: {new Date(initiative.startDate).toLocaleDateString()}</span>
            )}
            {initiative.targetDate && (
              <span>Target: {new Date(initiative.targetDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
