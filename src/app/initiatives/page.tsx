import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { listInitiatives } from '@/server/domain/initiatives'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { InitiativesPageClient } from './InitiativesPageClient'

export default async function InitiativesPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.initiatives.list(),
    queryFn: () => listInitiatives(),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InitiativesPageClient />
    </HydrationBoundary>
  )
}
