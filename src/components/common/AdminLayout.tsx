import { Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Navbar }      from './Navbar'
import { RefreshBar }  from './RefreshBar'
import { useAuth }     from '@/hooks/useAuth'

export function AdminLayout() {
  const { cerrarSesion } = useAuth()
  const navigate       = useNavigate()
  const queryClient    = useQueryClient()

  const handleLogout = async () => {
    queryClient.clear()
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F4F6F8', overflowX: 'hidden' }}>
      <RefreshBar />
      <Navbar onLogout={handleLogout} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="md:p-8" style={{ padding: '24px 16px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
