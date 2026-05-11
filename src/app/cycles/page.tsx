import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { listCycles } from '@/server/domain/cycles'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { CyclesPageClient } from './CyclesPageClient'

export default async function CyclesPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.cycles.list(),
    queryFn: () => listCycles(),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CyclesPageClient />
    </HydrationBoundary>
  )
}
