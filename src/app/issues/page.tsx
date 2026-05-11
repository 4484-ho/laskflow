import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { listIssues } from '@/server/domain/issues'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { IssuesPageClient } from './IssuesPageClient'

export default async function IssuesPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.issues.list({}),
    queryFn: () => listIssues({}),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="flex-1" />}>
        <IssuesPageClient />
      </Suspense>
    </HydrationBoundary>
  )
}
