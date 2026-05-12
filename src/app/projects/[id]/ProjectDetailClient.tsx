'use client'

import { useIssues } from '@/hooks/useIssues'
import { IssueList } from '@/components/issues/IssueList'
import { Topbar } from '@/components/layout/Topbar'
import type { Project } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { IssueDetailSlideover } from '@/components/issues/IssueDetailSlideover'

interface ProjectDetailClientProps {
  project: Project
}

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const { data: issues = [] } = useIssues({ projectId: project.id })
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected') ?? undefined

  const openIssue = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('selected', id)
    router.replace(`/projects/${project.id}?${params.toString()}`)
  }, [router, searchParams, project.id])

  const closeIssue = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('selected')
    router.replace(`/projects/${project.id}?${params.toString()}`)
  }, [router, searchParams, project.id])

  return (
    <>
      <Topbar title={project.title} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4">
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
