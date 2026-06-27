import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Expense, ExpenseKind, RecurrenceKind } from '@/types/api'

interface ExpenseFilter {
  kind?:       ExpenseKind
  onlyActive?: boolean
}

interface CreateExpenseInput {
  description:  string
  amount_cents: number
  kind:         ExpenseKind
  category_id:  string
  recurrence:   RecurrenceKind
  day_of_month: number
}

function buildQuery(filter: ExpenseFilter) {
  const params = new URLSearchParams()
  if (filter.kind)                  params.set('kind', filter.kind)
  if (filter.onlyActive !== false)  params.set('active', 'true')
  return params.toString() ? `?${params}` : ''
}

export function useExpenses(filter: ExpenseFilter = {}) {
  return useQuery({
    queryKey: queryKeys.expenses(filter),
    queryFn:  () => api.get<{ items: Expense[] }>(`/expenses${buildQuery(filter)}`).then(r => r.items ?? []),
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => api.post<Expense>('/expenses', data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExpenseInput> }) =>
      api.put<Expense>(`/expenses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeactivateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}
