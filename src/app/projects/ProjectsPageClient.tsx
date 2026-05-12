'use client'

import { useProjects } from '@/hooks/useProjects'
import { ProjectList } from '@/components/projects/ProjectList'
import { Topbar } from '@/components/layout/Topbar'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function ProjectsPageClient() {
  const { data: projects = [], isLoading, isError } = useProjects()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.projects.all })

  return (
    <>
      <Topbar title="Projects" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-sm font-medium text-neutral-900 mb-4">Projects</h1>
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Failed to load projects.</p>
          ) : (
            <ProjectList projects={projects} onCreated={refresh} />
          )}
        </div>
      </div>
    </>
  )
}
