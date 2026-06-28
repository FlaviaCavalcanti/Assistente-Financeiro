import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { InstallmentPlan } from '@/types/api'

interface CreateInstallmentInput {
  description:              string
  debt_id?:                 string
  category_id:              string
  total_cents:              number
  installment_amount_cents: number
  total_installments:       number
  paid_installments:        number
  first_due_date:           string // YYYY-MM-DD
}

interface UpdateInstallmentInput {
  description:              string
  debt_id?:                 string
  category_id:              string
  installment_amount_cents: number
  total_installments:       number
  paid_installments:        number
  first_due_date:           string // YYYY-MM-DD
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['installment-plans'] })
  qc.invalidateQueries({ queryKey: ['summary'] }) // atualiza "Comprometido" e gráfico
}

export function useInstallmentPlans(onlyActive = true) {
  return useQuery({
    queryKey: queryKeys.installmentPlans(onlyActive),
    queryFn:  () => api.get<{ items: InstallmentPlan[] }>(`/installment-plans?active=${onlyActive}`).then(r => r.items ?? []),
  })
}

export function useCreateInstallmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInstallmentInput) =>
      api.post<InstallmentPlan>('/installment-plans', data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateInstallmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInstallmentInput }) =>
      api.put<InstallmentPlan>(`/installment-plans/${id}`, data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function usePayInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<InstallmentPlan>(`/installment-plans/${id}/pay`, {}),
    onSuccess:  () => invalidateAll(qc),
  })
}

export function useDeactivateInstallmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/installment-plans/${id}`),
    onSuccess:  () => invalidateAll(qc),
  })
}
