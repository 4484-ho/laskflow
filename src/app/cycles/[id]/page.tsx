import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getCycle } from '@/server/domain/cycles'
import { listIssues } from '@/server/domain/issues'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { notFound } from 'next/navigation'
import { CycleDetailClient } from './CycleDetailClient'

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = getQueryClient()

  const [cycle] = await Promise.all([
    getCycle(id),
    queryClient.prefetchQuery({
      queryKey: queryKeys.issues.list({ cycleId: id }),
      queryFn: () => listIssues({ cycleId: id }),
    }),
  ])

  if (!cycle) notFound()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="flex-1" />}>
        <CycleDetailClient cycle={cycle} />
      </Suspense>
    </HydrationBoundary>
  )
}
