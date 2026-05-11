import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getProject } from '@/server/domain/projects'
import { listIssues } from '@/server/domain/issues'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { notFound } from 'next/navigation'
import { ProjectDetailClient } from './ProjectDetailClient'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = getQueryClient()

  const [project] = await Promise.all([
    getProject(id),
    queryClient.prefetchQuery({
      queryKey: queryKeys.issues.list({ projectId: id }),
      queryFn: () => listIssues({ projectId: id }),
    }),
  ])

  if (!project) notFound()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="flex-1" />}>
        <ProjectDetailClient project={project} />
      </Suspense>
    </HydrationBoundary>
  )
}
