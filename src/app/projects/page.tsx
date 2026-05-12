import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { listProjects } from '@/server/domain/projects'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { ProjectsPageClient } from './ProjectsPageClient'

export default async function ProjectsPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => listProjects(),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPageClient />
    </HydrationBoundary>
  )
}
