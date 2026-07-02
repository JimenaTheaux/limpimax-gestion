import { Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Navbar }     from './Navbar'
import { RefreshBar } from './RefreshBar'
import { useAuth }    from '@/hooks/useAuth'

export function ProduccionLayout() {
  const { cerrarSesion } = useAuth()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    queryClient.clear()
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F6F8', overflowX: 'hidden' }}>
      <RefreshBar />
      <Navbar onLogout={handleLogout} rootPath="/produccion" roleLabel="producción" />

      {/* Contenido */}
      <main style={{ padding: '16px' }}>
        <Outlet />
      </main>
    </div>
  )
}
