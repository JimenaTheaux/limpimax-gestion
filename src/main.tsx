import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 3,  // 3 min — no re-fetch si datos frescos
      gcTime:               1000 * 60 * 10, // 10 min en memoria aunque no se use
      retry:                1,
      retryDelay:           800,
      refetchOnWindowFocus: false,           // no re-fetch al volver a la ventana
      refetchOnReconnect:   true,            // sí re-fetch al reconectar (repartidor)
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
