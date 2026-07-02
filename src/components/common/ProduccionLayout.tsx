import { Outlet, useNavigate } from 'react-router-dom'
import { Factory, List, UserCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { BottomNav }  from './BottomNav'
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
      <main style={{ padding: '16px', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <BottomNav
        items={[
          { to: '/produccion',        icon: Factory,     label: 'Producción', end: true },
          { to: '/produccion/listos', icon: List,        label: 'Listos' },
          { to: '/produccion/perfil', icon: UserCircle,  label: 'Perfil' },
        ]}
        logoutAction={handleLogout}
      />
    </div>
  )
}
