import { useState } from 'react'
import { Plus, Search, ShoppingCart, Printer, X } from 'lucide-react'
import { Skeleton }         from '@/components/ui/skeleton'
import { BadgeEstado }      from '@/components/common/BadgeEstado'
import { EmptyState }       from '@/components/common/EmptyState'
import { ToastContainer }   from '@/components/common/ToastContainer'
import { useToast }         from '@/hooks/useToast'
import { DrawerPedido }     from '@/components/pedidos/DrawerPedido'
import { DrawerDetalle }    from '@/components/pedidos/DrawerDetalle'
import {
  usePedidos, totalPedido,
  type PedidoListItem, type PedidoDetalle,
} from '@/services/pedidos'
import { ESTADO_CONFIG, type EstadoPedido } from '@/types'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADOS_FILTRO: { value: EstadoPedido | ''; label: string }[] = [
  { value: '',               label: 'Todos' },
  { value: 'borrador',       label: 'Borrador' },
  { value: 'confirmado',     label: 'Confirmado' },
  { value: 'en_produccion',  label: 'En producción' },
  { value: 'listo_reparto',  label: 'Listo reparto' },
  { value: 'en_reparto',     label: 'En reparto' },
  { value: 'entregado',      label: 'Entregado' },
  { value: 'cerrado',        label: 'Cerrado' },
  { value: 'entrega_fallida', label: 'Entrega fallida' },
  { value: 'anulado',        label: 'Anulado' },
]

// ─── Card de pedido ───────────────────────────────────────────────────────────

function CardPedido({ pedido, onClick, seleccionado, modoSeleccion }: {
  pedido:        PedidoListItem
  onClick:       () => void
  seleccionado?: boolean
  modoSeleccion?: boolean
}) {
  const cfg   = ESTADO_CONFIG[pedido.estado]
  const total = Number(totalPedido(pedido))

  return (
    <button
      onClick={onClick}
      style={{
        background:   '#fff',
        borderRadius: 20,
        padding:      '14px 16px',
        boxShadow:    seleccionado
          ? '0 0 0 2px #0D5C8A, 0 2px 8px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        borderLeft:   `4px solid ${seleccionado ? '#0D5C8A' : cfg.color}`,
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
        width:        '100%',
        textAlign:    'left',
        border:       'none',
        cursor:       'pointer',
        transition:   'box-shadow 0.15s ease',
        backgroundColor: seleccionado ? '#F0F7FF' : '#fff',
      }}
    >
      {/* Checkbox visual en modo selección */}
      {modoSeleccion && (
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
          background:  seleccionado ? '#0D5C8A' : '#fff',
          border:      `2px solid ${seleccionado ? '#0D5C8A' : '#D1D5DB'}`,
          display:     'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {seleccionado && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1A2B3C', fontVariantNumeric: 'tabular-nums' }}>
            P-{String(pedido.numero).padStart(5, '0')}
          </span>
          <BadgeEstado estado={pedido.estado} />
          {pedido.fecha_produccion && (
            <span style={{ fontSize: 11, color: '#4A5568', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              Prod: {new Date(pedido.fecha_produccion + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>

        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#1A2B3C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pedido.clientes?.nombre ?? '—'}
        </p>

        <p style={{ margin: 0, fontSize: 12, color: '#4A5568' }}>
          <span style={{
            background: pedido.tipo_precio === 'mayorista' ? '#E8F4FF' : '#F0F0F0',
            color:      pedido.tipo_precio === 'mayorista' ? '#1B9ED6' : '#9A9A9A',
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, marginRight: 6,
          }}>
            {pedido.tipo_precio.toUpperCase()}
          </span>
          {pedido.direccion_entrega ?? ''}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: '#0D5C8A', letterSpacing: -0.5 }}>
          ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        {pedido.total_manual && (
          <p style={{ margin: 0, fontSize: 9, color: '#F57C00', fontWeight: 600 }}>MANUAL</p>
        )}
      </div>
    </button>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const [q, setQ]                   = useState('')
  const [estadoFiltro, setEstado]   = useState<EstadoPedido | ''>('')
  const [drawerForm, setDrawerForm] = useState(false)
  const [drawerDet, setDrawerDet]   = useState(false)
  const [pedidoEdit, setPedidoEdit] = useState<PedidoDetalle | null>(null)
  const [pedidoSelId, setSelId]     = useState<string | null>(null)
  const { toasts, show, dismiss }   = useToast()

  // ── Selección múltiple para impresión ──────────────────────────────────────
  const [modoSeleccion,  setModoSeleccion]  = useState(false)
  const [seleccionados,  setSeleccionados]  = useState<Set<string>>(new Set())

  const { data: pedidos, isLoading } = usePedidos({
    estado: estadoFiltro || undefined,
    q:      q || undefined,
  })

  const handleNuevo = () => { setPedidoEdit(null); setDrawerForm(true) }

  const handleVerDetalle = (id: string) => { setSelId(id); setDrawerDet(true) }

  const handleEditar = (p: PedidoDetalle) => {
    setPedidoEdit(p)
    setDrawerDet(false)
    setDrawerForm(true)
  }

  const handleSaved = (msg: string) => {
    if (msg.endsWith('|error')) show(msg.replace('|error', ''), 'error')
    else                        show(msg, 'success')
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const cancelarSeleccion = () => {
    setModoSeleccion(false)
    setSeleccionados(new Set())
  }

  const imprimirSeleccionados = () => {
    if (!seleccionados.size) return
    const ids = Array.from(seleccionados).join(',')
    window.open(`/print/facturas?ids=${ids}`, '_blank')
  }

  const nSel = seleccionados.size

  return (
    <div style={{ paddingBottom: nSel > 0 ? 80 : 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title">Pedidos</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!modoSeleccion ? (
            <>
              <button
                onClick={() => setModoSeleccion(true)}
                style={{
                  background: '#fff', color: '#4A5568',
                  border: '1.5px solid #D1D5DB', borderRadius: 10,
                  padding: '8px 14px', minHeight: 40, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Printer size={14} /> Seleccionar para imprimir
              </button>
              <button onClick={handleNuevo} style={{
                background: '#0D5C8A', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 16px', minHeight: 40,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Plus size={16} /> Nuevo pedido
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 600 }}>
                {nSel} seleccionado{nSel !== 1 ? 's' : ''}
              </span>
              <button
                onClick={cancelarSeleccion}
                style={{
                  background: 'transparent', color: '#4A5568',
                  border: '1.5px solid #D1D5DB', borderRadius: 10,
                  padding: '8px 12px', minHeight: 40, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <X size={14} /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por N° o cliente…"
          style={{ width: '100%', padding: '10px 10px 10px 36px', border: '1px solid #D1D5DB', borderRadius: 10, fontSize: 14, outline: 0, background: '#fff' }}
        />
      </div>

      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {ESTADOS_FILTRO.map(e => {
          const isActive = estadoFiltro === e.value
          const cfg      = e.value ? ESTADO_CONFIG[e.value as EstadoPedido] : null
          return (
            <button
              key={e.value}
              onClick={() => setEstado(e.value)}
              style={{
                flexShrink:   0,
                padding:      '6px 14px',
                borderRadius: 99,
                border:       `1.5px solid ${isActive ? (cfg?.color ?? '#0D5C8A') : '#D1D5DB'}`,
                background:   isActive ? (cfg?.bg ?? '#E8F4FF') : '#fff',
                color:        isActive ? (cfg?.color ?? '#0D5C8A') : '#4A5568',
                fontSize:     12,
                fontWeight:   isActive ? 600 : 400,
                cursor:       'pointer',
                whiteSpace:   'nowrap',
              }}
            >
              {e.label}
              {e.value && pedidos && (
                <span style={{
                  marginLeft: 5, background: isActive ? 'rgba(0,0,0,0.12)' : '#F0F0F0',
                  borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                }}>
                  {pedidos.filter(p => p.estado === e.value).length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <Skeleton key={i} style={{ height: 90, borderRadius: 20 }} />)}
        </div>
      ) : !pedidos?.length ? (
        <EmptyState
          icon={ShoppingCart}
          title={q || estadoFiltro ? 'Sin resultados' : 'No hay pedidos aún'}
          message={q || estadoFiltro ? 'Probá con otro filtro' : 'Creá el primer pedido del día.'}
          action={!(q || estadoFiltro) ? (
            <button onClick={handleNuevo} style={{
              background: '#0D5C8A', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 20px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer', minHeight: 44,
            }}>
              + Nuevo pedido
            </button>
          ) : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pedidos.map(p => (
            <CardPedido
              key={p.id}
              pedido={p}
              seleccionado={seleccionados.has(p.id)}
              modoSeleccion={modoSeleccion}
              onClick={() => {
                if (modoSeleccion) toggleSeleccion(p.id)
                else handleVerDetalle(p.id)
              }}
            />
          ))}
          <p style={{ fontSize: 12, color: '#4A5568', textAlign: 'center', marginTop: 4 }}>
            {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
          </p>
        </div>
      )}

      {/* Barra flotante de selección */}
      {modoSeleccion && nSel > 0 && (
        <div style={{
          position:  'fixed',
          bottom:    70,
          left:      '50%',
          transform: 'translateX(-50%)',
          background:'#1A2B3C',
          color:     '#fff',
          borderRadius: 99,
          padding:   '12px 20px',
          display:   'flex',
          alignItems:'center',
          gap:       14,
          zIndex:    100,
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          whiteSpace:'nowrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {nSel} pedido{nSel !== 1 ? 's' : ''} seleccionado{nSel !== 1 ? 's' : ''}
          </span>
          <button
            onClick={imprimirSeleccionados}
            style={{
              background:   '#0D5C8A',
              color:        '#fff',
              border:       'none',
              borderRadius: 20,
              padding:      '8px 18px',
              fontSize:     13,
              fontWeight:   700,
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
            }}
          >
            <Printer size={14} /> Imprimir facturas
          </button>
        </div>
      )}

      <DrawerPedido
        key={pedidoEdit?.id ?? 'new'}
        open={drawerForm}
        onClose={() => { setDrawerForm(false); setPedidoEdit(null) }}
        pedido={pedidoEdit}
        onSaved={handleSaved}
      />

      <DrawerDetalle
        open={drawerDet}
        pedidoId={pedidoSelId}
        onClose={() => { setDrawerDet(false); setSelId(null) }}
        onEditar={handleEditar}
        onSaved={handleSaved}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
