'use client'

import { useIssues } from '@/hooks/useIssues'
import { IssueList } from '@/components/issues/IssueList'
import { CycleProgressPanel } from '@/components/cycles/CycleProgressPanel'
import { Topbar } from '@/components/layout/Topbar'
import type { Cycle } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { IssueDetailSlideover } from '@/components/issues/IssueDetailSlideover'

interface CycleDetailClientProps {
  cycle: Cycle
}

export function CycleDetailClient({ cycle }: CycleDetailClientProps) {
  const { data: issues = [] } = useIssues({ cycleId: cycle.id })
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected') ?? undefined

  const openIssue = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('selected', id)
    router.replace(`/cycles/${cycle.id}?${params.toString()}`)
  }, [router, searchParams, cycle.id])

  const closeIssue = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('selected')
    router.replace(`/cycles/${cycle.id}?${params.toString()}`)
  }, [router, searchParams, cycle.id])

  return (
    <>
      <Topbar title={cycle.title} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4">
            <CycleProgressPanel cycle={cycle} issues={issues} />
            <IssueList issues={issues} onIssueClick={openIssue} />
          </div>
        </div>
        {selectedId && (
          <IssueDetailSlideover issueId={selectedId} onClose={closeIssue} />
        )}
      </div>
    </>
  )
}
