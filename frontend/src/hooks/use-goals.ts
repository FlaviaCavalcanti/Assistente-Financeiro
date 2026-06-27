import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Goal, GoalKind, Cents } from '@/types/api'

export interface CreateGoalInput {
  name:          string
  kind:          GoalKind
  target_cents:  Cents
  target_months: number
  current_cents: Cents
  deadline:      string
  icon:          string
  color:         string
}

export interface UpdateGoalInput {
  name?:          string
  target_cents?:  Cents
  target_months?: number
  current_cents?: Cents
  deadline?:      string
  icon?:          string
  color?:         string
}

export interface ContributeInput {
  amount_cents: Cents
}

export function useGoals(onlyActive = true) {
  return useQuery({
    queryKey: queryKeys.goals(onlyActive),
    queryFn:  () => api.get<{ items: Goal[] }>(`/goals?active=${onlyActive}`).then(r => r.items ?? []),
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGoalInput) => api.post<{ goal: Goal }>('/goals', data).then(r => r.goal),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      api.put<{ goal: Goal }>(`/goals/${id}`, data).then(r => r.goal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useContributeGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContributeInput }) =>
      api.post<{ goal: Goal }>(`/goals/${id}/contribute`, data).then(r => r.goal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeactivateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
