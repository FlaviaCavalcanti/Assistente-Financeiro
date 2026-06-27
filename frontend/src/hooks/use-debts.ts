import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Debt, DebtKind } from '@/types/api'

interface DebtFilter {
  kind?:       DebtKind
  onlyActive?: boolean
}

function buildQuery(filter: DebtFilter) {
  const params = new URLSearchParams()
  if (filter.kind)                  params.set('kind', filter.kind)
  if (filter.onlyActive !== false)  params.set('active', 'true')
  return params.toString() ? `?${params}` : ''
}

export function useDebts(filter: DebtFilter = {}) {
  return useQuery({
    queryKey: queryKeys.debts(filter),
    queryFn:  () => api.get<{ items: Debt[] }>(`/debts${buildQuery(filter)}`).then(r => r.items ?? []),
  })
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Debt>) => api.post<Debt>('/debts', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Debt> }) =>
      api.put<Debt>(`/debts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useDeactivateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/debts/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}
