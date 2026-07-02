import { Outlet, useNavigate } from 'react-router-dom'
import { IconTruck, IconClockHour3, IconRefresh, IconUser } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { BottomNav }  from './BottomNav'
import { Navbar }     from './Navbar'
import { RefreshBar } from './RefreshBar'
import { useAuth }    from '@/hooks/useAuth'
import { useOffline } from '@/hooks/useOffline'

export function RepartidorLayout() {
  const { cerrarSesion }                          = useAuth()
  const navigate                                  = useNavigate()
  const queryClient                               = useQueryClient()
  const { isOnline, pendingCount, syncing, sync } = useOffline()

  const handleLogout = async () => {
    queryClient.clear()
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F6F8', overflowX: 'hidden' }}>
      <RefreshBar />
      <Navbar
        onLogout={handleLogout}
        rootPath="/repartidor"
        roleLabel="repartidor"
        extra={
          <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isOnline ? '#2E9E5C' : '#9A9A9A',
              }}
            />
            <span
              className="hidden sm:inline"
              style={{ fontSize: 11, color: isOnline ? '#2E9E5C' : '#9A9A9A' }}
            >
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
          </div>
        }
      />

      {/* Banner: cambios pendientes de sincronizar */}
      {pendingCount > 0 && isOnline && !syncing && (
        <div
          style={{
            background:   '#FFFDE7',
            borderBottom: '0.5px solid #F9A825',
            padding:      '6px 16px',
            fontSize:     11,
            color:        '#F57F17',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            gap:          8,
          }}
        >
          <span>{pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de sincronizar</span>
          <button
            onClick={sync}
            style={{
              background: '#F9A825', color: '#fff', border: 'none',
              borderRadius: 6, padding: '3px 10px', fontSize: 11,
              fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Sincronizar
          </button>
        </div>
      )}

      {/* Banner: sincronizando */}
      {syncing && (
        <div
          style={{
            background:   '#E8F4FF',
            borderBottom: '0.5px solid #1B9ED6',
            padding:      '6px 16px',
            fontSize:     11,
            color:        '#0D5C8A',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
          }}
        >
          <IconRefresh size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
          Sincronizando…
        </div>
      )}

      {/* Banner: sin conexión con cambios pendientes */}
      {!isOnline && pendingCount > 0 && (
        <div
          style={{
            background:   '#FFFDE7',
            borderBottom: '0.5px solid #F9A825',
            padding:      '6px 16px',
            fontSize:     11,
            color:        '#F57F17',
          }}
        >
          Sin conexión — {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} en espera
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Contenido */}
      <main style={{ padding: '16px', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <BottomNav
        items={[
          { to: '/repartidor',           icon: IconTruck,      label: 'Pedidos',   end: true },
          { to: '/repartidor/historial', icon: IconClockHour3, label: 'Historial' },
          { to: '/repartidor/perfil',    icon: IconUser,       label: 'Perfil' },
        ]}
        logoutAction={handleLogout}
      />
    </div>
  )
}
