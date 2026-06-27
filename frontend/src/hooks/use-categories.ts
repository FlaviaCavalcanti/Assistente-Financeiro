import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Category } from '@/types/api'

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn:  () => api.get<{ items: Category[] }>('/categories').then(r => r.items ?? []),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string; icon: string }) =>
      api.post<Category>('/categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; color: string; icon: string } }) =>
      api.put<Category>(`/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}
