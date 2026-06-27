import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Transaction, TransactionListResponse, Direction, SourceKind } from '@/types/api'

export interface TransactionFilter {
  from?:        string
  to?:          string
  category_id?: string
  direction?:   Direction
  page?:        number
  limit?:       number
}

interface CreateTransactionInput {
  date:         string
  description:  string
  amount_cents: number
  direction:    Direction
  category_id?: string
  source_kind?: SourceKind
  note?:        string
}

function buildQuery(filter: TransactionFilter) {
  const params = new URLSearchParams()
  if (filter.from)        params.set('from', filter.from)
  if (filter.to)          params.set('to', filter.to)
  if (filter.category_id) params.set('category_id', filter.category_id)
  if (filter.direction)   params.set('direction', filter.direction)
  params.set('page',  String(filter.page  ?? 1))
  params.set('limit', String(filter.limit ?? 50))
  return `?${params}`
}

export function useTransactions(filter: TransactionFilter = {}) {
  return useQuery({
    queryKey: queryKeys.transactions(filter),
    queryFn:  () => api.get<TransactionListResponse>(`/transactions${buildQuery(filter)}`),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionInput) => api.post<Transaction>('/transactions', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionInput> }) =>
      api.put<Transaction>(`/transactions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
