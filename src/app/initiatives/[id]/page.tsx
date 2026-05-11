import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getInitiative } from '@/server/domain/initiatives'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { notFound } from 'next/navigation'
import { InitiativeDetailClient } from './InitiativeDetailClient'

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = getQueryClient()
  const initiative = await getInitiative(id)
  if (!initiative) notFound()

  await queryClient.prefetchQuery({
    queryKey: queryKeys.initiatives.detail(id),
    queryFn: () => Promise.resolve(initiative),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InitiativeDetailClient initiative={initiative} />
    </HydrationBoundary>
  )
}
