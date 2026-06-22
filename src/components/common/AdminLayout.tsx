import { useMemo }  from 'react'
import { Outlet }  from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Users, Package,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar }    from './Sidebar'
import { BottomNav }  from './BottomNav'
import { useSidebar } from '@/hooks/useSidebar'
import { pedidosListQueryFn }   from '@/services/pedidos'
import { clientesListQueryFn }  from '@/services/clientes'
import { productosListQueryFn } from '@/services/productos'

export function AdminLayout() {
  const { isOpen } = useSidebar()
  const qc = useQueryClient()

  const BOTTOM_NAV_ITEMS = useMemo(() => [
    { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard', end: true },
    {
      to: '/admin/pedidos', icon: ShoppingCart, label: 'Pedidos',
      prefetch: () => qc.prefetchQuery({
        queryKey: ['pedidos', undefined],
        queryFn:  () => pedidosListQueryFn(undefined),
        staleTime: 1000 * 60 * 2,
      }),
    },
    {
      to: '/admin/clientes', icon: Users, label: 'Clientes',
      prefetch: () => qc.prefetchQuery({
        queryKey: ['clientes', undefined, true],
        queryFn:  () => clientesListQueryFn(undefined, true),
        staleTime: 1000 * 60 * 2,
      }),
    },
    {
      to: '/admin/productos', icon: Package, label: 'Productos',
      prefetch: () => qc.prefetchQuery({
        queryKey: ['productos', undefined, undefined, true],
        queryFn:  () => productosListQueryFn(undefined, undefined, true),
        staleTime: 1000 * 60 * 5,
      }),
    },
  ], [qc])

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F8' }}>
      {/* Sidebar — solo desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main
        style={{
          minHeight:   '100vh',
          background:  '#F4F6F8',
          padding:     '24px 16px',
          paddingBottom: 80, // espacio bottom nav en mobile
          // En desktop, margin left respeta el sidebar
          transition:  'margin-left 0.25s ease',
        }}
        className="md:pb-8"
        // Margin dinámico según estado del sidebar (solo en md+)
      >
        {/* Spacer desktop para sidebar */}
        <div
          className="hidden md:block"
          style={{
            marginLeft: isOpen ? 240 : 64,
            transition: 'margin-left 0.25s ease',
          }}
        >
          <div style={{ padding: '24px 32px', minHeight: '100vh' }}>
            <Outlet />
          </div>
        </div>

        {/* Mobile: sin sidebar */}
        <div className="block md:hidden">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — solo mobile */}
      <div className="block md:hidden">
        <BottomNav items={BOTTOM_NAV_ITEMS} />
      </div>
    </div>
  )
}
