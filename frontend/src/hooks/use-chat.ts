import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Transaction } from '@/types/api'

export interface ChatStatus {
  available:  boolean
  has_model:  boolean
  model:      string
}

export interface ChatAction {
  type:         string
  transaction?: Transaction
}

export interface ChatMessageResponse {
  reply:   string
  action?: ChatAction
}

export function useChatStatus() {
  return useQuery({
    queryKey: ['chat-status'],
    queryFn:  () => api.get<ChatStatus>('/chat/status'),
    refetchInterval: 30_000,
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { text: string; date?: string }) =>
      api.post<ChatMessageResponse>('/chat/message', payload),
    onSuccess: () => {
      // invalida extrato e painel pois pode ter criado transações
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}
