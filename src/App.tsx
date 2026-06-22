import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute }   from '@/components/common/ProtectedRoute'
import { AdminLayout }      from '@/components/common/AdminLayout'
import { ProduccionLayout } from '@/components/common/ProduccionLayout'
import { RepartidorLayout } from '@/components/common/RepartidorLayout'
import { FetchingBar }      from '@/components/common/FetchingBar'
import LoginPage            from '@/pages/LoginPage'

// ─── Lazy loading por rol — cada grupo carga su chunk independiente ────────────

const AdminDashboard  = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminPedidos    = lazy(() => import('@/pages/admin/PedidosPage'))
const AdminClientes   = lazy(() => import('@/pages/admin/ClientesPage'))
const AdminProductos  = lazy(() => import('@/pages/admin/ProductosPage'))
const AdminUsuarios   = lazy(() => import('@/pages/admin/UsuariosPage'))

const ProduccionHome   = lazy(() => import('@/pages/produccion/ProduccionPage'))
const ProduccionListos = lazy(() => import('@/pages/produccion/ListosPage'))

const RepartidorHome      = lazy(() => import('@/pages/repartidor/RepartidorPage'))
const RepartidorHistorial = lazy(() => import('@/pages/repartidor/HistorialPage'))

const PrintPedido  = lazy(() => import('@/pages/print/PrintPedidoPage'))
const ListadoDia   = lazy(() => import('@/pages/print/ListadoDiaPage'))
const FacturasA4   = lazy(() => import('@/pages/print/FacturasPage'))

// ─── Spinner de carga entre chunks ───────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #D1D5DB', borderTopColor: '#0D5C8A',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  return (
    <>
    <FetchingBar />
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin / Superadmin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index        element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
        <Route path="pedidos"   element={<Suspense fallback={<PageLoader />}><AdminPedidos /></Suspense>} />
        <Route path="clientes"  element={<Suspense fallback={<PageLoader />}><AdminClientes /></Suspense>} />
        <Route path="productos" element={<Suspense fallback={<PageLoader />}><AdminProductos /></Suspense>} />
        <Route path="usuarios"  element={<Suspense fallback={<PageLoader />}><AdminUsuarios /></Suspense>} />
      </Route>

      {/* Producción */}
      <Route
        path="/produccion"
        element={
          <ProtectedRoute roles={['produccion', 'admin', 'superadmin']}>
            <ProduccionLayout />
          </ProtectedRoute>
        }
      >
        <Route index         element={<Suspense fallback={<PageLoader />}><ProduccionHome /></Suspense>} />
        <Route path="listos" element={<Suspense fallback={<PageLoader />}><ProduccionListos /></Suspense>} />
      </Route>

      {/* Repartidor */}
      <Route
        path="/repartidor"
        element={
          <ProtectedRoute roles={['repartidor', 'admin', 'superadmin']}>
            <RepartidorLayout />
          </ProtectedRoute>
        }
      >
        <Route index             element={<Suspense fallback={<PageLoader />}><RepartidorHome /></Suspense>} />
        <Route path="historial"  element={<Suspense fallback={<PageLoader />}><RepartidorHistorial /></Suspense>} />
      </Route>

      {/* Vistas de impresión — sin layout */}
      <Route
        path="/print/facturas"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <Suspense fallback={<PageLoader />}><FacturasA4 /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/print/listado"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <Suspense fallback={<PageLoader />}><ListadoDia /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/print/:id"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <Suspense fallback={<PageLoader />}><PrintPedido /></Suspense>
          </ProtectedRoute>
        }
      />

      <Route path="/"  element={<Navigate to="/login" replace />} />
      <Route path="*"  element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  )
}
