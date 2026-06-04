import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Factory, Truck, CheckCircle, AlertCircle, DollarSign, RefreshCw, FileText } from 'lucide-react'
import { Skeleton }    from '@/components/ui/skeleton'
import { BadgeEstado } from '@/components/common/BadgeEstado'
import { useDashboard } from '@/services/produccion'
import { ESTADO_CONFIG, type EstadoPedido } from '@/types'

// ─── Card KPI ─────────────────────────────────────────────────────────────────

function CardKPI({ label, valor, sublabel, icon: Icon, color, bg, onClick }: {
  label:    string
  valor:    string | number
  sublabel?: string
  icon:     React.ElementType
  color:    string
  bg:       string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 20, padding: '18px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 8,
        border: 'none', cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left', transition: 'box-shadow 0.2s',
        flex: 1, minWidth: 140,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#1A2B3C', letterSpacing: -1 }}>
          {valor}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#4A5568' }}>{label}</p>
        {sublabel && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9A9A9A' }}>{sublabel}</p>}
      </div>
    </button>
  )
}

// ─── Tablero de estados ───────────────────────────────────────────────────────

const ESTADOS_ACTIVOS: EstadoPedido[] = [
  'borrador', 'confirmado', 'en_produccion', 'listo_reparto', 'en_reparto',
]

function TableroPedidos({ porEstado, pedidosHoy }: {
  porEstado:  Record<string, number>
  pedidosHoy: { id: string; numero: number; estado: EstadoPedido; totalCalculado: string; totalManual: string | null; formaCobro: string | null; montoCobrado: string | null }[]
}) {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <p className="section-title" style={{ marginBottom: 16 }}>Tablero de estados — Hoy</p>

      {ESTADOS_ACTIVOS.map(estado => {
        const count    = porEstado[estado] ?? 0
        const cfg      = ESTADO_CONFIG[estado]
        const pedidos  = pedidosHoy.filter(p => p.estado === estado)
        if (!count) return null

        return (
          <div key={estado} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <BadgeEstado estado={estado} />
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{count}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
              {pedidos.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate('/admin/pedidos')}
                  style={{
                    background: cfg.bg, borderRadius: 10, padding: '8px 12px',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A2B3C' }}>
                    P-{String(p.numero).padStart(5, '0')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D5C8A' }}>
                    ${Number(p.totalManual ?? p.totalCalculado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {ESTADOS_ACTIVOS.every(e => !(porEstado[e] ?? 0)) && (
        <p style={{ fontSize: 13, color: '#4A5568', textAlign: 'center', padding: '20px 0' }}>
          Sin pedidos activos hoy.
        </p>
      )}
    </div>
  )
}

// ─── Seguimiento de cobros ────────────────────────────────────────────────────

function SeguimientoCobros({ data }: { data: { totalEfectivo: number; totalTransferencia: number; totalCobrado: number; cobrandoPendientes: number } }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <p className="section-title" style={{ marginBottom: 16 }}>Cobros del día</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#E8F8F0', borderRadius: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2E9E5C' }}>💵 Efectivo</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#2E9E5C' }}>
            ${data.totalEfectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#E8F4FF', borderRadius: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B9ED6' }}>🏦 Transferencia</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#1B9ED6' }}>
            ${data.totalTransferencia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F4F6F8', borderRadius: 12, borderTop: '2px solid #D1D5DB' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1A2B3C' }}>Total cobrado</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#0D5C8A', letterSpacing: -0.5 }}>
            ${data.totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {data.cobrandoPendientes > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FFFDE7', borderRadius: 12, border: '1px solid #F9A825' }}>
            <AlertCircle size={16} color="#F9A825" />
            <span style={{ fontSize: 13, color: '#F57C00', fontWeight: 600 }}>
              {data.cobrandoPendientes} cobro{data.cobrandoPendientes !== 1 ? 's' : ''} pendiente{data.cobrandoPendientes !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useDashboard()

  if (isLoading) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: 100, borderRadius: 20, flex: 1, minWidth: 130 }} />)}
        </div>
        <Skeleton style={{ height: 300, borderRadius: 20 }} />
      </div>
    )
  }

  const hoy = data?.hoy
  const activos = data?.activos

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 className="section-title">Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => {
              const hoy = new Date().toISOString().split('T')[0]
              window.open(`/print/listado?fecha=${hoy}`, '_blank')
            }}
            style={{
              background: '#0D5C8A', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <FileText size={14} /> Listado del día
          </button>
          <button onClick={() => refetch()} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4A5568', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
          }}>
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <CardKPI
          label="Pedidos hoy"
          valor={hoy?.total ?? 0}
          sublabel={`${activos?.total ?? 0} activos en total`}
          icon={ShoppingCart}
          color="#1B9ED6" bg="#E8F4FF"
          onClick={() => navigate('/admin/pedidos')}
        />
        <CardKPI
          label="En producción"
          valor={activos?.porEstado?.en_produccion ?? 0}
          icon={Factory}
          color="#F57C00" bg="#FFF3E0"
          onClick={() => navigate('/admin/pedidos')}
        />
        <CardKPI
          label="En reparto"
          valor={(activos?.porEstado?.listo_reparto ?? 0) + (activos?.porEstado?.en_reparto ?? 0)}
          sublabel={`${activos?.porEstado?.listo_reparto ?? 0} listos · ${activos?.porEstado?.en_reparto ?? 0} en camino`}
          icon={Truck}
          color="#1565C0" bg="#E3F2FD"
          onClick={() => navigate('/admin/pedidos')}
        />
        <CardKPI
          label="Cobrado hoy"
          valor={`$${(hoy?.totalCobrado ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          sublabel={hoy?.cobrandoPendientes ? `${hoy.cobrandoPendientes} pendiente${hoy.cobrandoPendientes !== 1 ? 's' : ''}` : 'Al día'}
          icon={DollarSign}
          color="#2E9E5C" bg="#E8F8F0"
        />
      </div>

      {/* Alertas */}
      {data && (activos?.porEstado?.entrega_fallida ?? 0) > 0 && (
        <div style={{
          background: '#FDECEA', border: '1px solid #D32F2F', borderRadius: 14,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={18} color="#D32F2F" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D32F2F' }}>
            {data!.activos.porEstado.entrega_fallida} entrega{data!.activos.porEstado.entrega_fallida !== 1 ? 's' : ''} fallida{data!.activos.porEstado.entrega_fallida !== 1 ? 's' : ''} — requieren reagendado
          </span>
          <button onClick={() => navigate('/admin/pedidos')} style={{
            marginLeft: 'auto', background: '#D32F2F', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Ver
          </button>
        </div>
      )}

      {/* Entregados hoy */}
      {data && (hoy?.porEstado?.entregado ?? 0) > 0 && (
        <div style={{
          background: '#E8F8F0', borderRadius: 14, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircle size={18} color="#2E9E5C" />
          <span style={{ fontSize: 14, color: '#2E9E5C', fontWeight: 600 }}>
            {data!.hoy.porEstado.entregado} entrega{data!.hoy.porEstado.entregado !== 1 ? 's' : ''} completada{data!.hoy.porEstado.entregado !== 1 ? 's' : ''} hoy
          </span>
        </div>
      )}

      {/* Grid tablero + cobros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {data && (
          <TableroPedidos
            porEstado={data.activos.porEstado}
            pedidosHoy={data.pedidosHoy}
          />
        )}
        {hoy && <SeguimientoCobros data={hoy} />}
      </div>
    </div>
  )
}
