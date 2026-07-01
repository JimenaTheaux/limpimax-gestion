import { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

function handleAuthError() {
  supabase.auth.refreshSession().then(({ error: refreshError }) => {
    if (refreshError) {
      window.location.href = '/login'
    } else {
      queryClient.invalidateQueries()
    }
  })
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 3,
      gcTime:               1000 * 60 * 10,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.code === 'PGRST301') return false
        return failureCount < 1
      },
      retryDelay:           800,
      refetchOnWindowFocus: false,
      refetchOnMount:       'stale',
      refetchOnReconnect:   true,
    },
    mutations: {
      onError: (error: any) => {
        if (error?.status === 401 || error?.code === 'PGRST301') {
          handleAuthError()
        }
      },
    },
  },
})
