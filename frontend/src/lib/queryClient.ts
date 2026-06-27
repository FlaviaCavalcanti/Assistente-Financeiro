import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,
      gcTime:               300_000,
      retry: (count, err) =>
        !(err instanceof ApiError && err.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (err) => {
        if (err instanceof ApiError) {
          console.error(`[API] ${err.code}: ${err.message}`)
        }
      },
    },
  },
})
