'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProjectList } from '@/components/projects/ProjectList'
import { Topbar } from '@/components/layout/Topbar'
import type { Project } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const load = useCallback(() => setRefreshKey((k) => k + 1), [])

  // TODO(Phase 2b): migrate to TanStack Query (useProjects/useInitiatives/useCycles hooks)
  // and add error handling consistent with IssuesPageClient.
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects)
  }, [refreshKey])

  return (
    <>
      <Topbar title="Projects" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-200 mb-4">Projects</h1>
          <ProjectList projects={projects} onCreated={load} />
        </div>
      </div>
    </>
  )
}
