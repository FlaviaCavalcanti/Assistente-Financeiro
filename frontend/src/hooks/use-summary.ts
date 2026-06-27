import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Summary } from '@/types/api'

export function useMonthSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.summary(month),
    queryFn:  () => api.get<{ summary: Summary }>(`/summary?month=${month}`).then(r => r.summary),
    enabled:  Boolean(month),
  })
}
