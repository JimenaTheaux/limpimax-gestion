import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Factory, Truck, AlertCircle, DollarSign, RefreshCw, FileText, Clock } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton }    from '@/components/ui/skeleton'
import { BadgeEstado } from '@/components/common/BadgeEstado'
import { useDashboard } from '@/services/produccion'
import { useEditarCobro } from '@/services/pedidos'
import { ESTADO_CONFIG, type EstadoPedido } from '@/types'
import type { PedidoPendienteCobro } from '@/services/produccion'

// ─── Card KPI ─────────────────────────────────────────────────────────────────

function CardKPI({ label, valor, sublabel, icon: Icon, color, bg, onClick, alerta }: {
  label:    string
  valor:    string | number
  sublabel?: string
  icon:     React.ElementType
  color:    string
  bg:       string
  onClick?: () => void
  alerta?:  boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={onClick ? `${label}: ${valor}` : undefined}
      style={{
        background: '#fff', borderRadius: 20, padding: '18px 20px',
        boxShadow: alerta
          ? '0 2px 8px rgba(211,47,47,0.15), 0 0 0 2px #D32F2F'
          : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 8,
        border: 'none', cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left', transition: 'box-shadow 0.2s',
        flex: 1, minWidth: 140,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = alerta
        ? '0 2px 8px rgba(211,47,47,0.15), 0 0 0 2px #D32F2F'
        : '0 2px 8px rgba(0,0,0,0.06)')}
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

// ─── Fila de pedido pendiente con mini-form de cobro ─────────────────────────

function FilaPendiente({ p, onCobrado }: {
  p:          PedidoPendienteCobro
  onCobrado:  (msg: string) => void
}) {
  const editarCobro = useEditarCobro()
  const [abierto,  setAbierto]  = useState(false)
  const [forma,    setForma]    = useState<'efectivo' | 'transferencia'>('efectivo')
  const [monto,    setMonto]    = useState(String(Math.round(p.totalPedido)))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const montoRef  = useRef<HTMLInputElement>(null)
  const btnRef    = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (abierto) montoRef.current?.focus()
  }, [abierto])

  const dias = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86_400_000)

  const handleAbrir = () => {
    setMonto(String(Math.round(p.totalPedido)))
    setForma('efectivo')
    setError(null)
    setAbierto(true)
  }

  const handleConfirmar = async () => {
    if (!monto.trim()) { setError('Ingresá el monto cobrado'); return }
    setLoading(true)
    setError(null)
    try {
      await editarCobro.mutateAsync({
        id:            p.id,
        forma_cobro:   forma,
        monto_cobrado: monto,
        estado_pago:   'cobrado',
      })
      onCobrado(`P-${String(p.numero).padStart(5, '0')} marcado como cobrado`)
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: abierto ? '#fff' : '#FFFDE7',
      border: `1.5px solid ${abierto ? '#145A32' : '#F9A825'}`,
      borderRadius: 16, overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Resumen */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1A2B3C' }}>
              P-{String(p.numero).padStart(5, '0')}
            </span>
            {dias > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: dias > 2 ? '#FDECEA' : '#FFFDE7',
                color:      dias > 2 ? '#D32F2F' : '#F57C00',
                padding: '2px 7px', borderRadius: 99,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <Clock size={9} />
                {dias === 1 ? 'ayer' : `${dias}d`}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1A2B3C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.clienteNombre}
          </p>
          {p.fechaProduccion && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#4A5568' }}>
              Prod: {new Date(p.fechaProduccion + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            </p>
          )}
        </div>

        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 17, color: '#0D5C8A', letterSpacing: -0.5 }}>
            ${p.totalPedido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          {!abierto && (
            <button
              ref={btnRef}
              onClick={handleAbrir}
              aria-label={`Marcar cobrado el pedido P-${String(p.numero).padStart(5, '0')}`}
              style={{
                background: '#0D5C8A', color: '#fff', border: 'none',
                borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                minHeight: 34,
              }}
            >
              Registrar cobro
            </button>
          )}
        </div>
      </div>

      {/* Mini-form cobro */}
      {abierto && (
        <div
          role="group"
          aria-label={`Registrar cobro — P-${String(p.numero).padStart(5, '0')}`}
          style={{
            padding: '0 16px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ height: 1, background: '#E8F0E8', margin: '0 0 4px' }} />

          {/* Selector forma de cobro */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4A5568' }}>
              Forma de cobro
            </p>
            <div role="radiogroup" aria-label="Forma de cobro" style={{ display: 'flex', gap: 8 }}>
              {(['efectivo', 'transferencia'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={forma === f}
                  onClick={() => setForma(f)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10,
                    fontSize: 13, fontWeight: 600,
                    border: `2px solid ${forma === f ? '#145A32' : '#D1D5DB'}`,
                    background: forma === f ? '#D4EDDA' : '#F8F9FA',
                    color: forma === f ? '#145A32' : '#4A5568',
                    cursor: 'pointer', transition: 'all 0.12s',
                    minHeight: 44,
                  }}
                >
                  {f === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div>
            <label
              htmlFor={`monto-${p.id}`}
              style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4A5568' }}
            >
              Monto cobrado *
            </label>
            <input
              ref={montoRef}
              id={`monto-${p.id}`}
              type="number"
              inputMode="decimal"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              aria-describedby={error ? `error-${p.id}` : undefined}
              aria-invalid={!!error}
              style={{
                width: '100%', padding: '11px 14px',
                border: `1.5px solid ${error ? '#D32F2F' : '#D1D5DB'}`,
                borderRadius: 10, fontSize: 15, fontFamily: 'Inter, sans-serif',
                outline: 0, boxSizing: 'border-box',
                transition: 'border-color 0.12s',
              }}
              onFocus={e  => (e.target.style.borderColor = '#145A32')}
              onBlur={e   => (e.target.style.borderColor = error ? '#D32F2F' : '#D1D5DB')}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmar() }}
            />
            {error && (
              <p id={`error-${p.id}`} role="alert" style={{ margin: '6px 0 0', fontSize: 12, color: '#D32F2F' }}>
                {error}
              </p>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleConfirmar}
              disabled={loading}
              aria-disabled={loading}
              style={{
                flex: 1,
                background: loading ? 'rgba(20,90,50,0.5)' : '#145A32',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', minHeight: 48,
              }}
            >
              {loading ? 'Guardando…' : '✓ Confirmar cobro'}
            </button>
            <button
              onClick={() => setAbierto(false)}
              disabled={loading}
              style={{
                flex: 1, background: 'transparent', color: '#4A5568',
                border: '1.5px solid #D1D5DB', borderRadius: 10,
                padding: '12px', fontSize: 14, cursor: 'pointer', minHeight: 48,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sheet pendientes de cobro ────────────────────────────────────────────────

function SheetPendientes({ open, onClose, pendientes, onRefetch }: {
  open:      boolean
  onClose:   () => void
  pendientes: { count: number; total: number; pedidos: PedidoPendienteCobro[] }
  onRefetch: () => void
}) {
  const [lista, setLista] = useState<PedidoPendienteCobro[]>(pendientes.pedidos)

  // Sincronizar cuando cambia pendientes (ej. al refetch)
  useEffect(() => { setLista(pendientes.pedidos) }, [pendientes.pedidos])

  const total = lista.reduce((acc, p) => acc + p.totalPedido, 0)

  const handleCobrado = (msg: string) => {
    // Quitar la fila de la lista local inmediatamente (optimistic)
    const numero = parseInt(msg.match(/P-(\d+)/)?.[1] ?? '0')
    setLista(prev => prev.filter(p => p.numero !== numero))
    onRefetch()
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        {/* Header fijo */}
        <SheetHeader style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
          <SheetTitle style={{ fontSize: 16 }}>Pendientes de cobro</SheetTitle>
          {lista.length > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4A5568' }}>
              {lista.length} pedido{lista.length !== 1 ? 's' : ''} sin cobrar
            </p>
          )}
        </SheetHeader>

        {/* Lista scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>✓</p>
              <p style={{ fontWeight: 600, fontSize: 15, color: '#1A2B3C', margin: 0 }}>Todo al día</p>
              <p style={{ fontSize: 13, color: '#4A5568', margin: '4px 0 0' }}>No hay cobros pendientes</p>
            </div>
          ) : lista.map(p => (
            <FilaPendiente key={p.id} p={p} onCobrado={handleCobrado} />
          ))}
        </div>

        {/* Pie fijo con total */}
        {lista.length > 0 && (
          <div style={{
            flexShrink: 0,
            padding: '16px 24px',
            borderTop: '2px solid #F0F0F0',
            background: '#FDECEA',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#D32F2F' }}>Total pendiente</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#D32F2F', letterSpacing: -0.5 }}>
              ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Tablero de estados ───────────────────────────────────────────────────────

const ESTADOS_ACTIVOS: EstadoPedido[] = [
  'borrador', 'confirmado', 'en_produccion', 'listo_reparto', 'en_reparto',
]

function TableroPedidos({ porEstado, pedidosHoy }: {
  porEstado:  Record<string, number>
  pedidosHoy: { id: string; numero: number; estado: EstadoPedido; totalCalculado: string; totalManual: string | null }[]
}) {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <p className="section-title" style={{ marginBottom: 16 }}>Tablero de estados — Hoy</p>

      {ESTADOS_ACTIVOS.map(estado => {
        const count   = porEstado[estado] ?? 0
        const cfg     = ESTADO_CONFIG[estado]
        const pedidos = pedidosHoy.filter(p => p.estado === estado)
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

function SeguimientoCobros({ data }: {
  data: { totalEfectivo: number; totalTransferencia: number; totalCobrado: number; cobrandoPendientes: number }
}) {
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
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useDashboard()
  const [sheetPendientes, setSheetPendientes] = useState(false)

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

  const hoy        = data?.hoy
  const activos    = data?.activos
  const pendientes = data?.pendientes

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 className="section-title">Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => window.open(`/print/listado?fecha=${new Date().toISOString().split('T')[0]}`, '_blank')}
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
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <CardKPI
          label="Pedidos hoy"
          valor={hoy?.total ?? 0}
          sublabel={`${activos?.total ?? 0} activos en total`}
          icon={ShoppingCart} color="#1B9ED6" bg="#E8F4FF"
          onClick={() => navigate('/admin/pedidos')}
        />
        <CardKPI
          label="En producción"
          valor={activos?.porEstado?.en_produccion ?? 0}
          icon={Factory} color="#F57C00" bg="#FFF3E0"
          onClick={() => navigate('/admin/pedidos')}
        />
        <CardKPI
          label="En reparto"
          valor={(activos?.porEstado?.listo_reparto ?? 0) + (activos?.porEstado?.en_reparto ?? 0)}
          sublabel={`${activos?.porEstado?.listo_reparto ?? 0} listos · ${activos?.porEstado?.en_reparto ?? 0} en camino`}
          icon={Truck} color="#1565C0" bg="#E3F2FD"
          onClick={() => navigate('/admin/pedidos')}
        />
        <CardKPI
          label="Cobrado hoy"
          valor={`$${(hoy?.totalCobrado ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          sublabel="Efectivo + transferencia"
          icon={DollarSign} color="#2E9E5C" bg="#E8F8F0"
        />
        {(pendientes?.count ?? 0) > 0 && (
          <CardKPI
            label="Pendiente cobro"
            valor={pendientes!.count}
            sublabel={`$${pendientes!.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })} sin cobrar`}
            icon={AlertCircle} color="#D32F2F" bg="#FDECEA"
            onClick={() => setSheetPendientes(true)}
            alerta
          />
        )}
      </div>

      {/* Alerta entregas fallidas */}
      {(activos?.porEstado?.entrega_fallida ?? 0) > 0 && (
        <div style={{
          background: '#FDECEA', border: '1px solid #D32F2F', borderRadius: 14,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={18} color="#D32F2F" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D32F2F' }}>
            {activos!.porEstado.entrega_fallida} entrega{activos!.porEstado.entrega_fallida !== 1 ? 's' : ''} fallida{activos!.porEstado.entrega_fallida !== 1 ? 's' : ''} — requieren reagendado
          </span>
          <button onClick={() => navigate('/admin/pedidos')} style={{
            marginLeft: 'auto', background: '#D32F2F', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Ver
          </button>
        </div>
      )}

      {/* Tablero + cobros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {data && (
          <TableroPedidos
            porEstado={data.activos.porEstado}
            pedidosHoy={data.pedidosHoy}
          />
        )}
        {hoy && <SeguimientoCobros data={hoy} />}
      </div>

      {/* Sheet pendientes */}
      {pendientes && (
        <SheetPendientes
          open={sheetPendientes}
          onClose={() => setSheetPendientes(false)}
          pendientes={pendientes}
          onRefetch={() => refetch()}
        />
      )}
    </div>
  )
}
