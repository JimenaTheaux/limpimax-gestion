import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Users, Package,
} from 'lucide-react'
import { Sidebar }   from './Sidebar'
import { BottomNav } from './BottomNav'
import { useSidebar } from '@/hooks/useSidebar'

const BOTTOM_NAV_ITEMS = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/pedidos',   icon: ShoppingCart,    label: 'Pedidos' },
  { to: '/admin/clientes',  icon: Users,           label: 'Clientes' },
  { to: '/admin/productos', icon: Package,         label: 'Productos' },
]

export function AdminLayout() {
  const { isOpen } = useSidebar()

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F6F8', overflowX: 'hidden' }}>
      {/* Sidebar — solo desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main
        style={{
          minHeight:     '100dvh',
          background:    '#F4F6F8',
          padding:       '24px 16px',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
          transition:    'margin-left 0.25s ease',
        }}
        className="md:pb-8"
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
