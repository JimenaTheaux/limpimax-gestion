import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Check, Package, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastContainer } from '@/components/common/ToastContainer'
import { useToast }        from '@/hooks/useToast'
import { usePedidosProduccion, useResumenProduccion, type PedidoProduccion } from '@/services/produccion'
import { useCambiarEstado } from '@/services/pedidos'

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

const HOY = new Date().toISOString().split('T')[0]

function labelFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha'
  const d = new Date(fecha + 'T00:00:00')
  if (fecha === HOY) return 'Hoy'
  const diff = Math.round((d.getTime() - new Date(HOY + 'T00:00:00').getTime()) / 86400000)
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
}

// ─── Panel resumen colapsable ─────────────────────────────────────────────────

function PanelResumen({ fecha }: { fecha?: string }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useResumenProduccion(fecha)

  return (
    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '14px 20px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0D5C8A', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Package size={16} /> Resumen de producción
          {data?.length ? (
            <span style={{ background: '#E8F4FF', color: '#1B9ED6', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
              {data.length} artículos
            </span>
          ) : null}
        </span>
        {open ? <ChevronUp size={16} color="#4A5568" /> : <ChevronDown size={16} color="#4A5568" />}
      </button>

      {open && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid #F4F6F8' }}>
          {isLoading ? (
            <Skeleton style={{ height: 60, borderRadius: 10, marginTop: 12 }} />
          ) : !data?.length ? (
            <p style={{ color: '#4A5568', fontSize: 13, marginTop: 12 }}>Sin pedidos en producción.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #D1D5DB' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px', color: '#4A5568', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Producto</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px', color: '#4A5568', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Total</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px', color: '#F57C00', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Bidón nuevo</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px', color: '#4A5568', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F4F6F8' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 500 }}>
                      {r.nombreProducto}
                      {r.presentacion && <span style={{ color: '#4A5568', fontWeight: 400 }}> — {r.presentacion}{r.unidadMedida === 'litros' ? 'L' : ''}</span>}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: '#0D5C8A' }}>
                      {r.totalCantidad}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: r.totalBidonNuevo > 0 ? '#F57C00' : '#9A9A9A' }}>
                      {r.totalBidonNuevo > 0 ? r.totalBidonNuevo : '—'}
                    </td>
                    <td style={{ padding: '8px 4px', color: '#4A5568' }}>
                      {labelFecha(r.fechaProduccion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card de pedido para producción ──────────────────────────────────────────

function CardProduccion({ pedido, onMarcarListo }: { pedido: PedidoProduccion; onMarcarListo: () => void }) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div style={{
      background: '#fff', borderRadius: 20, padding: '14px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft: '4px solid #F57C00',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1A2B3C' }}>
            P-{String(pedido.numero).padStart(5, '0')}
          </span>
          <span style={{ marginLeft: 8, fontWeight: 600, fontSize: 14, color: '#1A2B3C' }}>
            {pedido.clienteNombre}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#4A5568' }}>
          {new Date(pedido.updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Ítems */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {pedido.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8, background: '#F4F6F8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12, color: '#0D5C8A', flexShrink: 0,
            }}>
              {item.cantidad}
            </span>
            <span style={{ fontWeight: 500 }}>
              {item.nombre}{item.fragancia ? ` (${item.fragancia})` : ''}
              <span style={{ color: '#4A5568', fontWeight: 400 }}> · {item.presentacion}L</span>
            </span>
            {item.bidonNuevo && (
              <span style={{ fontSize: 9, fontWeight: 700, background: '#FFF3E0', color: '#F57C00', padding: '2px 6px', borderRadius: 99 }}>
                BIDÓN NUEVO
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Notas producción */}
      {pedido.notasProduccion && (
        <p style={{ fontSize: 12, color: '#4A5568', background: '#F4F6F8', borderRadius: 8, padding: '6px 10px', margin: '0 0 12px' }}>
          {pedido.notasProduccion}
        </p>
      )}

      {/* Botón marcar listo */}
      {!confirmando ? (
        <button
          onClick={() => setConfirmando(true)}
          style={{
            width: '100%', background: '#E8F8F0', color: '#2E9E5C',
            border: '1.5px solid #2E9E5C', borderRadius: 10,
            padding: '13px', minHeight: 48, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Check size={18} /> Marcar listo para reparto
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { onMarcarListo(); setConfirmando(false) }}
            style={{
              flex: 1, background: '#2E9E5C', color: '#fff', border: 'none',
              borderRadius: 10, padding: '13px', minHeight: 48, fontSize: 15,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            ✓ Confirmar
          </button>
          <button
            onClick={() => setConfirmando(false)}
            style={{
              flex: 1, background: 'transparent', color: '#4A5568',
              border: '1.5px solid #D1D5DB', borderRadius: 10,
              padding: '13px', minHeight: 48, fontSize: 15, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Kanban Desktop ───────────────────────────────────────────────────────────

function KanbanDesktop({ grupos, onMarcarListo }: {
  grupos: Map<string, PedidoProduccion[]>
  onMarcarListo: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, minHeight: 400 }}>
      {Array.from(grupos.entries()).map(([fecha, pedidosFecha]) => {
        const esHoy = fecha === HOY
        return (
          <div key={fecha} style={{
            minWidth: 300, maxWidth: 340, flexShrink: 0,
            background: esHoy ? '#E8F4FF' : '#F4F6F8',
            borderRadius: 16, padding: 16,
            border: esHoy ? '2px solid #1B9ED6' : '2px solid transparent',
          }}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: esHoy ? '#1B9ED6' : '#1A2B3C' }}>
                {labelFecha(fecha)}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#4A5568' }}>
                {pedidosFecha.length} pedido{pedidosFecha.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pedidosFecha.map(p => (
                <CardProduccion key={p.id} pedido={p} onMarcarListo={() => onMarcarListo(p.id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Lista Mobile agrupada ────────────────────────────────────────────────────

function ListaMobile({ grupos, onMarcarListo }: {
  grupos: Map<string, PedidoProduccion[]>
  onMarcarListo: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Array.from(grupos.entries()).map(([fecha, pedidosFecha]) => {
        const esHoy = fecha === HOY
        const d = fecha ? new Date(fecha + 'T00:00:00') : null
        const subtitulo = d ? d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' }) : ''

        return (
          <div key={fecha}>
            {/* Encabezado de día */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <div style={{ flex: 1, height: 1, background: esHoy ? '#1B9ED6' : '#D1D5DB' }} />
              <div style={{
                background: esHoy ? '#1B9ED6' : '#F4F6F8',
                color:      esHoy ? '#fff' : '#4A5568',
                borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {labelFecha(fecha)} — {subtitulo} · {pedidosFecha.length} pedido{pedidosFecha.length !== 1 ? 's' : ''}
              </div>
              <div style={{ flex: 1, height: 1, background: esHoy ? '#1B9ED6' : '#D1D5DB' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pedidosFecha.map(p => (
                <CardProduccion key={p.id} pedido={p} onMarcarListo={() => onMarcarListo(p.id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ProduccionPage() {
  const [fechaFiltro, setFechaFiltro] = useState<string | undefined>(undefined)
  const { toasts, show, dismiss }     = useToast()
  const cambiarEstado                 = useCambiarEstado()

  const { data: pedidosProd, isLoading, refetch } = usePedidosProduccion(fechaFiltro)

  // Agrupar por fecha de producción, ordenado cronológicamente
  const grupos = useMemo(() => {
    const map = new Map<string, PedidoProduccion[]>()
    pedidosProd?.forEach(p => {
      const key = p.fechaProduccion ?? 'sin-fecha'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
  }, [pedidosProd])

  const handleMarcarListo = async (id: string) => {
    try {
      // estadoActual siempre es 'en_produccion' en esta vista — evita la lectura previa
      await cambiarEstado.mutateAsync({ id, estadoActual: 'en_produccion', estado: 'listo_reparto' })
      show('Pedido marcado como listo para reparto', 'success')
      refetch()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  const totalPedidos = pedidosProd?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="section-title">Producción</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => refetch()} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4A5568', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
          }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <input
            type="date"
            value={fechaFiltro ?? ''}
            onChange={e => setFechaFiltro(e.target.value || undefined)}
            style={{
              padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 10,
              fontSize: 13, background: '#fff', cursor: 'pointer',
            }}
          />
          {fechaFiltro && (
            <button onClick={() => setFechaFiltro(undefined)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#4A5568', fontSize: 12,
            }}>
              Ver todos
            </button>
          )}
        </div>
      </div>

      {/* Resumen colapsable */}
      <PanelResumen fecha={fechaFiltro} />

      {/* Contenido */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2].map(i => <Skeleton key={i} style={{ height: 180, borderRadius: 20 }} />)}
        </div>
      ) : !totalPedidos ? (
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Package size={48} strokeWidth={1.2} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#1A2B3C', margin: '0 0 4px' }}>
            {fechaFiltro ? 'Sin pedidos para esa fecha' : 'No hay pedidos en producción'}
          </p>
          <p style={{ fontSize: 13, color: '#4A5568', margin: 0 }}>
            Los pedidos confirmados aparecen aquí automáticamente.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: kanban */}
          <div className="hidden md:block">
            <KanbanDesktop grupos={grupos} onMarcarListo={handleMarcarListo} />
          </div>
          {/* Mobile: lista agrupada */}
          <div className="block md:hidden">
            <ListaMobile grupos={grupos} onMarcarListo={handleMarcarListo} />
          </div>
        </>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
