import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 2,  // 2 min — datos frescos no se re-piden
      gcTime:               1000 * 60 * 10, // 10 min en caché aunque no se use
      retry:                2,
      retryDelay:           1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
      refetchOnMount:       'stale',        // re-fetch solo si los datos están viejos
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
