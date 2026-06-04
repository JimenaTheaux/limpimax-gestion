import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Truck, RefreshCw } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ButtonGroup }    from '@/components/common/ButtonGroup'
import { FloatInput }     from '@/components/common/FloatInput'
import { BadgeEstado }    from '@/components/common/BadgeEstado'
import { Skeleton }       from '@/components/ui/skeleton'
import { ToastContainer } from '@/components/common/ToastContainer'
import { useToast }       from '@/hooks/useToast'
import { useOffline }     from '@/hooks/useOffline'
import { usePedidos, useCambiarEstado, useEditarCobro, totalPedido, type PedidoListItem } from '@/services/pedidos'
import { ESTADO_CONFIG }  from '@/types'
import type { AddActionInput } from '@/hooks/useOffline'

// ─── Drawer Registrar Entrega ─────────────────────────────────────────────────

function DrawerEntrega({ pedido, isOnline, addAction, onClose, onSaved }: {
  pedido:     PedidoListItem | null
  isOnline:   boolean
  addAction:  (a: AddActionInput) => Promise<void>
  onClose:    () => void
  onSaved:    (msg: string) => void
}) {
  const cambiar      = useCambiarEstado()
  const editarCobro  = useEditarCobro()
  const [forma,  setForma]  = useState<'efectivo' | 'transferencia' | 'pendiente'>('efectivo')
  const [monto,  setMonto]  = useState(pedido ? String(Math.round(Number(totalPedido(pedido)))) : '')
  const [notas,  setNotas]  = useState('')
  const saving = cambiar.isPending || editarCobro.isPending

  if (!pedido) return null

  const handleConfirmar = async () => {
    if (!isOnline) {
      // Encolar ambas acciones para cuando vuelva la conexión
      await addAction({ type: 'cambiarEstado', pedidoId: pedido.id, estadoNuevo: 'entregado', notas: notas.trim() || undefined })
      await addAction({ type: 'editarCobro',   pedidoId: pedido.id, formaCobro: forma, montoCobrado: monto || undefined })
      onSaved('Entrega guardada offline — se enviará al reconectar')
      onClose()
      return
    }

    try {
      await cambiar.mutateAsync({
        id:     pedido.id,
        estado: 'entregado',
        notas:  notas.trim() || undefined,
      })
      await editarCobro.mutateAsync({
        id:           pedido.id,
        formaCobro:   forma,
        montoCobrado: monto || undefined,
      })
      onSaved('Entrega registrada correctamente')
      onClose()
    } catch (e) {
      onSaved((e instanceof Error ? e.message : 'Error') + '|error')
    }
  }

  return (
    <Sheet open={!!pedido} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            Registrar entrega — P-{String(pedido.numero).padStart(5, '0')}
          </SheetTitle>
        </SheetHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#4A5568' }}>
            <strong>{pedido.clienteNombre}</strong>
            {pedido.direccionEntrega && <> · {pedido.direccionEntrega}</>}
          </p>

          {/* Total a cobrar */}
          <div style={{
            background: '#E8F4FF', borderRadius: 14, padding: '14px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: '#1B9ED6', fontWeight: 600 }}>Total a cobrar</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#0D5C8A', letterSpacing: -1 }}>
              ${Number(totalPedido(pedido)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <ButtonGroup
            label="Forma de cobro"
            value={forma}
            onChange={v => setForma(v as typeof forma)}
            options={[
              { value: 'efectivo',      label: 'Efectivo',  color: '#2E9E5C' },
              { value: 'transferencia', label: 'Transf.',   color: '#1B9ED6' },
              { value: 'pendiente',     label: 'Pendiente', color: '#F9A825' },
            ]}
          />

          <FloatInput
            label="Monto cobrado"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            inputMode="decimal"
          />

          <FloatInput
            label="Observaciones (opcional)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />

          {!isOnline && (
            <div style={{
              background: '#FFFDE7', border: '1px solid #F9A825', borderRadius: 10,
              padding: '8px 12px', fontSize: 12, color: '#F57C00', display: 'flex', gap: 6,
            }}>
              Sin conexión — la entrega se guardará localmente y se enviará al reconectar.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <button
              onClick={handleConfirmar}
              disabled={saving}
              style={{
                background: saving ? 'rgba(46,158,92,0.5)' : '#2E9E5C', color: '#fff',
                border: 'none', borderRadius: 10, padding: '14px', minHeight: 48,
                fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Guardando…' : isOnline ? '✓ Confirmar entrega' : '✓ Guardar offline'}
            </button>
            <button onClick={onClose} style={{
              background: 'transparent', color: '#4A5568', border: '1.5px solid #D1D5DB',
              borderRadius: 10, padding: '12px', fontSize: 14, cursor: 'pointer', minHeight: 44,
            }}>
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Drawer Entrega Fallida ───────────────────────────────────────────────────

function DrawerFalla({ pedido, isOnline, addAction, onClose, onSaved }: {
  pedido:    PedidoListItem | null
  isOnline:  boolean
  addAction: (a: AddActionInput) => Promise<void>
  onClose:   () => void
  onSaved:   (msg: string) => void
}) {
  const cambiar          = useCambiarEstado()
  const [motivo, setMotivo] = useState('')
  const saving = cambiar.isPending

  if (!pedido) return null

  const handleConfirmar = async () => {
    if (!motivo.trim()) return

    if (!isOnline) {
      await addAction({ type: 'cambiarEstado', pedidoId: pedido.id, estadoNuevo: 'entrega_fallida', notas: motivo.trim() })
      onSaved('Falla guardada offline — se enviará al reconectar')
      onClose()
      return
    }

    try {
      await cambiar.mutateAsync({ id: pedido.id, estado: 'entrega_fallida', notas: motivo.trim() })
      onSaved('Entrega fallida registrada')
      onClose()
    } catch (e) {
      onSaved((e instanceof Error ? e.message : 'Error') + '|error')
    }
  }

  return (
    <Sheet open={!!pedido} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Entrega fallida — P-{String(pedido.numero).padStart(5, '0')}</SheetTitle>
        </SheetHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#4A5568' }}>
            <strong>{pedido.clienteNombre}</strong> · {pedido.direccionEntrega ?? ''}
          </p>

          <div>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A5568' }}>
              Motivo *
            </span>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Describí por qué no se pudo entregar…"
              rows={4}
              style={{
                width: '100%', marginTop: 6, padding: '10px 12px',
                border: '1.5px solid #D1D5DB', borderRadius: 10, resize: 'vertical',
                fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 0,
              }}
              onFocus={e => (e.target.style.borderColor = '#1B9ED6')}
              onBlur={e  => (e.target.style.borderColor = '#D1D5DB')}
            />
          </div>

          {!isOnline && (
            <div style={{
              background: '#FFFDE7', border: '1px solid #F9A825', borderRadius: 10,
              padding: '8px 12px', fontSize: 12, color: '#F57C00',
            }}>
              Sin conexión — se guardará offline y se enviará al reconectar.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleConfirmar}
              disabled={saving || !motivo.trim()}
              style={{
                background: !motivo.trim() ? 'rgba(211,47,47,0.4)' : '#D32F2F', color: '#fff',
                border: 'none', borderRadius: 10, padding: '14px', minHeight: 48,
                fontSize: 15, fontWeight: 700, cursor: !motivo.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Guardando…' : isOnline ? 'Confirmar entrega fallida' : 'Guardar offline'}
            </button>
            <button onClick={onClose} style={{
              background: 'transparent', color: '#4A5568', border: '1.5px solid #D1D5DB',
              borderRadius: 10, padding: '12px', fontSize: 14, cursor: 'pointer', minHeight: 44,
            }}>
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Card del repartidor ──────────────────────────────────────────────────────

function CardRepartidor({ pedido, onEntregar, onFalla, onEmergencia }: {
  pedido:       PedidoListItem
  onEntregar:   () => void
  onFalla:      () => void
  onEmergencia: () => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [confEmerg, setConfEmerg] = useState(false)
  const cfg   = ESTADO_CONFIG[pedido.estado]
  const total = Number(totalPedido(pedido))

  return (
    <div style={{
      background:   '#fff',
      borderRadius: 20,
      boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft:   `4px solid ${cfg.color}`,
      overflow:     'hidden',
    }}>
      {/* Cabecera siempre visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', padding: '14px 16px', background: 'none',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1A2B3C' }}>
              P-{String(pedido.numero).padStart(5, '0')}
            </span>
            <BadgeEstado estado={pedido.estado} />
          </div>
          <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 15, color: '#1A2B3C' }}>
            {pedido.clienteNombre}
          </p>
          {pedido.direccionEntrega && (
            <p style={{ margin: 0, fontSize: 13, color: '#4A5568' }}>{pedido.direccionEntrega}</p>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 20, color: '#0D5C8A', letterSpacing: -1 }}>
            ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          {expanded ? <ChevronUp size={16} color="#4A5568" /> : <ChevronDown size={16} color="#4A5568" />}
        </div>
      </button>

      {/* Detalle expandible */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #F4F6F8' }}>
          {pedido.notasProduccion && (
            <p style={{ fontSize: 12, color: '#4A5568', background: '#F4F6F8', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>
              {pedido.notasProduccion}
            </p>
          )}
        </div>
      )}

      {/* Acciones según estado */}
      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pedido.estado === 'listo_reparto' && (
          <button onClick={onEntregar} style={{
            background: '#0D5C8A', color: '#fff', border: 'none', borderRadius: 10,
            padding: '13px', minHeight: 48, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            ✓ Entregar
          </button>
        )}

        {pedido.estado === 'en_reparto' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEntregar} style={{
              flex: 1, background: '#2E9E5C', color: '#fff', border: 'none', borderRadius: 10,
              padding: '13px', minHeight: 48, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              ✓ Entregado
            </button>
            <button onClick={onFalla} style={{
              flex: 1, background: '#FDECEA', color: '#D32F2F',
              border: '1.5px solid #D32F2F', borderRadius: 10,
              padding: '13px', minHeight: 48, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Falla
            </button>
          </div>
        )}

        {pedido.estado === 'en_produccion' && (
          !confEmerg ? (
            <button
              onClick={() => setConfEmerg(true)}
              style={{
                background: '#FFF3E0', color: '#F57C00',
                border: '1.5px solid #F57C00', borderRadius: 10,
                padding: '11px', minHeight: 44, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <AlertTriangle size={14} /> Avance de emergencia
            </button>
          ) : (
            <div style={{ background: '#FFF3E0', borderRadius: 12, padding: 12 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#F57C00', fontWeight: 600 }}>
                ¿Confirmás que ya retiraste este pedido?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { onEmergencia(); setConfEmerg(false) }} style={{
                  flex: 1, background: '#F57C00', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  Sí, retiré
                </button>
                <button onClick={() => setConfEmerg(false)} style={{
                  flex: 1, background: 'transparent', color: '#4A5568',
                  border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '10px',
                  fontSize: 13, cursor: 'pointer',
                }}>
                  Cancelar
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RepartidorPage() {
  const HOY = new Date().toISOString().split('T')[0]
  const { toasts, show, dismiss }             = useToast()
  const { isOnline, addAction, refreshCount } = useOffline()
  const cambiar                               = useCambiarEstado()

  const [entregando, setEntregando] = useState<PedidoListItem | null>(null)
  const [falla,      setFalla]      = useState<PedidoListItem | null>(null)

  const { data: pedidos, isLoading, refetch } = usePedidos({ fechaProduccion: HOY })

  const pedidosFiltrados = pedidos?.filter(p =>
    ['en_produccion', 'listo_reparto', 'en_reparto'].includes(p.estado)
  ) ?? []

  const listos    = pedidosFiltrados.filter(p => p.estado === 'listo_reparto')
  const enReparto = pedidosFiltrados.filter(p => p.estado === 'en_reparto')
  const enProd    = pedidosFiltrados.filter(p => p.estado === 'en_produccion')

  const handleSalirARepartir = async () => {
    if (!isOnline) {
      for (const p of listos) {
        await addAction({ type: 'cambiarEstado', pedidoId: p.id, estadoNuevo: 'en_reparto' })
      }
      await refreshCount()
      show(`${listos.length} pedido${listos.length !== 1 ? 's' : ''} encolados offline`, 'info')
      return
    }
    try {
      await Promise.all(listos.map(p =>
        cambiar.mutateAsync({ id: p.id, estado: 'en_reparto' })
      ))
      show(`${listos.length} pedido${listos.length !== 1 ? 's' : ''} en camino`, 'success')
      refetch()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  const handleEmergencia = async (id: string) => {
    if (!isOnline) {
      await addAction({ type: 'cambiarEstado', pedidoId: id, estadoNuevo: 'en_reparto', notas: 'Avance de emergencia — repartidor' })
      show('Avance guardado offline', 'info')
      return
    }
    try {
      await cambiar.mutateAsync({ id, estado: 'en_reparto', notas: 'Avance de emergencia — repartidor' })
      show('Avance de emergencia registrado', 'info')
      refetch()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  const handleSaved = (msg: string) => {
    if (msg.endsWith('|error')) show(msg.replace('|error', ''), 'error')
    else { show(msg, 'success'); refetch() }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="section-title">Pedidos del día</h1>
        <button onClick={() => refetch()} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#4A5568', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
        }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Botón salir a repartir */}
      {listos.length > 0 && (
        <button
          onClick={handleSalirARepartir}
          disabled={cambiar.isPending}
          style={{
            width: '100%', background: '#0D5C8A', color: '#fff', border: 'none',
            borderRadius: 14, padding: '16px', minHeight: 56, fontSize: 16, fontWeight: 800,
            cursor: 'pointer', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(13,92,138,0.3)',
          }}
        >
          <Truck size={20} />
          Salir a repartir ({listos.length} pedido{listos.length !== 1 ? 's' : ''})
        </button>
      )}

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <Skeleton key={i} style={{ height: 120, borderRadius: 20 }} />)}
        </div>
      ) : !pedidosFiltrados.length ? (
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Truck size={48} strokeWidth={1.2} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#1A2B3C', margin: '0 0 4px' }}>Sin pedidos para hoy</p>
          <p style={{ fontSize: 13, color: '#4A5568', margin: 0 }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {enReparto.map(p => (
            <CardRepartidor key={p.id} pedido={p}
              onEntregar={() => setEntregando(p)}
              onFalla={() => setFalla(p)}
              onEmergencia={() => handleEmergencia(p.id)}
            />
          ))}
          {listos.map(p => (
            <CardRepartidor key={p.id} pedido={p}
              onEntregar={() => setEntregando(p)}
              onFalla={() => setFalla(p)}
              onEmergencia={() => handleEmergencia(p.id)}
            />
          ))}
          {enProd.map(p => (
            <CardRepartidor key={p.id} pedido={p}
              onEntregar={() => setEntregando(p)}
              onFalla={() => setFalla(p)}
              onEmergencia={() => handleEmergencia(p.id)}
            />
          ))}
        </div>
      )}

      <DrawerEntrega
        pedido={entregando}
        isOnline={isOnline}
        addAction={addAction}
        onClose={() => setEntregando(null)}
        onSaved={handleSaved}
      />
      <DrawerFalla
        pedido={falla}
        isOnline={isOnline}
        addAction={addAction}
        onClose={() => setFalla(null)}
        onSaved={handleSaved}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
