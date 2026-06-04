import { Outlet, useNavigate } from 'react-router-dom'
import { Truck, History, LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { BottomNav }    from './BottomNav'
import { useAuth }      from '@/hooks/useAuth'
import { useOffline }   from '@/hooks/useOffline'

export function RepartidorLayout() {
  const { usuario, cerrarSesion }              = useAuth()
  const navigate                               = useNavigate()
  const { isOnline, pendingCount, syncing, sync } = useOffline()

  const handleLogout = async () => {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F8' }}>
      {/* Topbar */}
      <header
        style={{
          height:         56,
          background:     'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          borderBottom:   '1px solid #D1D5DB',
          padding:        '0 16px',
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          position:       'sticky',
          top:            0,
          zIndex:         50,
        }}
      >
        <div
          style={{
            width:          28,
            height:         28,
            borderRadius:   6,
            background:     '#1B9ED6',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          '#fff',
            fontSize:       11,
            fontWeight:     900,
            flexShrink:     0,
          }}
        >
          LM
        </div>

        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A2B3C' }}>
            Reparto
          </span>
          {usuario && (
            <span style={{ fontSize: 12, color: '#4A5568', marginLeft: 6 }}>
              — {usuario.nombre}
            </span>
          )}
        </div>

        {/* Indicador de conexión — SIEMPRE visible */}
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        5,
            padding:    '4px 10px',
            borderRadius: 99,
            background: isOnline ? '#E8F8F0' : '#F0F0F0',
            fontSize:   11,
            fontWeight: 600,
            color:      isOnline ? '#2E9E5C' : '#9A9A9A',
            flexShrink: 0,
          }}
        >
          {isOnline
            ? <><Wifi size={12} /> En línea</>
            : <><WifiOff size={12} /> Sin conexión</>
          }
        </div>

        <button
          onClick={handleLogout}
          style={{
            background:   'transparent',
            border:       'none',
            cursor:       'pointer',
            color:        '#4A5568',
            padding:      6,
            borderRadius: 6,
            display:      'flex',
            alignItems:   'center',
          }}
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Banner: sin conexión o sincronizando o pendientes */}
      {(!isOnline || pendingCount > 0 || syncing) && (
        <div
          style={{
            background:  !isOnline ? '#FFFDE7' : '#E8F4FF',
            borderBottom: `1px solid ${!isOnline ? '#F9A825' : '#1B9ED6'}`,
            padding:     '8px 16px',
            fontSize:    13,
            color:       !isOnline ? '#F57C00' : '#0D5C8A',
            fontWeight:  500,
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'space-between',
            gap:         8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isOnline
              ? <><WifiOff size={14} /> Sin conexión</>
              : <><RefreshCw size={14} style={{ animation: syncing ? 'spin 0.8s linear infinite' : undefined }} /> Sincronizando…</>
            }
            {pendingCount > 0 && !syncing && (
              <span style={{ fontWeight: 700 }}>
                — {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {isOnline && pendingCount > 0 && !syncing && (
            <button
              onClick={sync}
              style={{
                background: '#0D5C8A', color: '#fff', border: 'none',
                borderRadius: 6, padding: '4px 10px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Sincronizar
            </button>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Contenido */}
      <main style={{ padding: '16px', paddingBottom: 72 }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <BottomNav items={[
        { to: '/repartidor',           icon: Truck,   label: 'Pedidos', end: true },
        { to: '/repartidor/historial', icon: History, label: 'Historial' },
      ]} />
    </div>
  )
}
