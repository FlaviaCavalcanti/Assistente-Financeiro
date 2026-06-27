import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { IncomeSource, IncomeKind, RecurrenceKind } from '@/types/api'

interface CreateIncomeInput {
  name:         string
  kind:         IncomeKind
  gross_cents:  number
  net_cents:    number
  recurrence:   RecurrenceKind
  day_of_month: number
  first_month?: string // YYYY-MM (renda avulsa)
  last_month?:  string // YYYY-MM (renda avulsa, vazio = só um mês)
}

export function useIncomeSources(onlyActive = true) {
  return useQuery({
    queryKey: queryKeys.incomeSources(onlyActive),
    queryFn:  () => api.get<{ items: IncomeSource[] }>(`/income-sources?active=${onlyActive}`).then(r => r.items ?? []),
  })
}

export function useCreateIncomeSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIncomeInput) => api.post<IncomeSource>('/income-sources', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['income-sources'] }),
  })
}

export function useUpdateIncomeSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateIncomeInput> }) =>
      api.put<IncomeSource>(`/income-sources/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income-sources'] }),
  })
}

export function useDeactivateIncomeSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/income-sources/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['income-sources'] }),
  })
}
