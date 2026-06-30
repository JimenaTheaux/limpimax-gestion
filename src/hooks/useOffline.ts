import { useState, useEffect, useCallback, useRef } from 'react'
import {
  addToQueue, getQueue, removeFromQueue, getQueueCount,
  type OfflineAction, type PagoOffline,
} from '@/lib/offlineQueue'
import { supabase } from '@/lib/supabase'
import type { EstadoPedido } from '@/types'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type { PagoOffline }

export type AddActionInput =
  | { type: 'cambiarEstado'; pedidoId: string; estadoNuevo: EstadoPedido; notas?: string }
  | { type: 'editarCobro';   pedidoId: string; formaCobro: string; montoCobrado?: string }
  | { type: 'cerrarPedido';  pedidoId: string; clienteId: string; pagos: PagoOffline[]; totalPedido: number; estadoPago: 'cobrado' | 'pendiente'; notasEntrega?: string; fechaPago?: string }

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOffline() {
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing,      setSyncing]      = useState(false)
  const syncingRef = useRef(false)

  // ── Leer cuenta de la cola ──────────────────────────────────────────────────

  const refreshCount = useCallback(async () => {
    const count = await getQueueCount()
    setPendingCount(count)
  }, [])

  useEffect(() => { refreshCount() }, [refreshCount])

  // ── Procesar cola al reconectar ─────────────────────────────────────────────

  const sync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return
    syncingRef.current = true
    setSyncing(true)

    try {
      const queue = (await getQueue()).sort((a, b) => a.timestamp - b.timestamp)

      for (const action of queue) {
        try {
          if (action.type === 'cambiarEstado') {
            const { error } = await supabase
              .from('pedidos')
              .update({ estado: action.estadoNuevo })
              .eq('id', action.pedidoId)
            if (error) throw new Error(error.message)
          } else if (action.type === 'editarCobro') {
            const { error } = await supabase
              .from('pedidos')
              .update({
                forma_cobro:   action.formaCobro,
                monto_cobrado: action.montoCobrado ? parseFloat(action.montoCobrado) : null,
              })
              .eq('id', action.pedidoId)
            if (error) throw new Error(error.message)
          } else if (action.type === 'cerrarPedido') {
            const pagos           = action.pagos ?? []
            const montoTotalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
            const diferencia      = (action.totalPedido ?? 0) - montoTotalPagado
            const estadoPago: 'cobrado' | 'pendiente' = diferencia > 0 ? 'pendiente' : 'cobrado'
            const fechaPago       = action.fechaPago ?? new Date().toISOString().split('T')[0]
            const fechaCobro      = montoTotalPagado > 0 ? fechaPago : null

            const { error } = await supabase
              .from('pedidos')
              .update({
                estado:        'cerrado',
                estado_pago:   estadoPago,
                notas_entrega: action.notasEntrega ?? null,
                fecha_cobro:   fechaCobro,
                updated_at:    new Date().toISOString(),
              })
              .eq('id', action.pedidoId)
            if (error) throw new Error(error.message)

            const pagosValidos = pagos.filter(p => (parseFloat(p.monto) || 0) > 0)
            if (pagosValidos.length > 0) {
              await supabase.from('pedido_pagos').insert(
                pagosValidos.map(p => ({
                  pedido_id:  action.pedidoId,
                  forma_pago: p.forma_pago,
                  monto:      parseFloat(p.monto),
                  fecha_pago: fechaPago,
                }))
              )
            }

            if (action.clienteId) {
              await supabase
                .from('clientes')
                .update({ saldo_pendiente: diferencia })
                .eq('id', action.clienteId)
            }
          }
          await removeFromQueue(action.id)
        } catch (e) {
          // Error de red → parar para reintentar después
          if (e instanceof TypeError) break
          // Error de API (404, estado inválido) → descartar para no bloquear la cola
          await removeFromQueue(action.id)
        }
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
      await refreshCount()
    }
  }, [refreshCount])

  // ── Escuchar eventos de red ─────────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      sync()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [sync])

  // ── Agregar acción a la cola ────────────────────────────────────────────────

  const addAction = useCallback(async (input: AddActionInput) => {
    const action: OfflineAction = {
      ...input,
      id:        crypto.randomUUID(),
      timestamp: Date.now(),
    }
    await addToQueue(action)
    await refreshCount()
  }, [refreshCount])

  return { isOnline, pendingCount, syncing, addAction, sync }
}
