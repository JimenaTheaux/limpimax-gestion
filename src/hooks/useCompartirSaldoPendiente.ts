import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { createElement } from 'react'
import { SaldoPendienteCanvas } from '@/components/pedidos/SaldoPendienteCanvas'
import type { ClienteConSaldo, PedidoPendienteDetalle } from '@/services/produccion'
import { supabase } from '@/lib/supabase'

export function useCompartirSaldoPendiente() {
  const [loading, setLoading] = useState(false)

  const compartir = async (
    cliente: ClienteConSaldo,
    onError?: (msg: string) => void,
  ) => {
    setLoading(true)

    // 1. Fetch pedidos pendientes del cliente
    let pedidos: PedidoPendienteDetalle[] = []
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, fecha_produccion, total_calculado, total_manual, pedido_pagos(monto)')
        .eq('cliente_id', cliente.id)
        .eq('estado', 'cerrado')
        .eq('estado_pago', 'pendiente')
        .order('fecha_produccion', { ascending: false })
      if (error) throw new Error(error.message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pedidos = (data ?? []).map((p: any): PedidoPendienteDetalle => {
        const total     = parseFloat(p.total_manual ?? p.total_calculado ?? '0') || 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumaPagos = (p.pedido_pagos ?? []).reduce((s: number, pg: any) => s + Number(pg.monto), 0)
        return {
          id:              p.id,
          numero:          p.numero,
          fechaProduccion: p.fecha_produccion,
          totalPedido:     total,
          sumaPagos,
          pendiente:       Math.max(0, total - sumaPagos),
        }
      })
    } catch (err) {
      console.error('useCompartirSaldoPendiente: error al cargar pedidos', err)
      onError?.('No se pudieron cargar los pedidos. Intentá de nuevo.')
      setLoading(false)
      return
    }

    // 2. Montar SaldoPendienteCanvas en div oculto
    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;pointer-events:none'
    document.body.appendChild(container)

    let canvas: HTMLCanvasElement | null = null

    try {
      await new Promise<void>(resolve => {
        const root = createRoot(container)
        root.render(createElement(SaldoPendienteCanvas, { cliente, pedidos }))
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      canvas = await html2canvas(container, {
        scale:           2,
        useCORS:         true,
        backgroundColor: '#ffffff',
        width:           600,
        logging:         false,
      })
    } catch (err) {
      console.error('useCompartirSaldoPendiente: error al generar imagen', err)
      onError?.('No se pudo generar la imagen. Intentá de nuevo.')
      document.body.removeChild(container)
      setLoading(false)
      return
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }

    if (!canvas) {
      onError?.('No se pudo generar la imagen. Intentá de nuevo.')
      setLoading(false)
      return
    }

    // 3. Convertir canvas a Blob JPG
    let blob: Blob
    try {
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas!.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/jpeg', 0.95)
      )
    } catch {
      onError?.('No se pudo generar la imagen. Intentá de nuevo.')
      setLoading(false)
      return
    }

    const slug     = cliente.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const fileName = `saldo-${slug}.jpg`
    const file     = new File([blob], fileName, { type: 'image/jpeg' })

    // Limpiar teléfono: quitar no-dígitos, 0 inicial y 54 si ya lo tenía
    const telefono = cliente.telefono
      ?.replace(/\D/g, '')
      ?.replace(/^0/, '')
      ?.replace(/^54/, '') ?? ''

    const mensaje = encodeURIComponent(
      'Hola! Te enviamos el detalle de tu saldo pendiente con Limpimax.'
    )

    const esMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (esMobile) {
      if (
        navigator.share &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `Saldo pendiente — ${cliente.nombre}`,
          })
          setLoading(false)
          return
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') {
            console.warn('useCompartirSaldoPendiente: share nativo falló, usando fallback', err)
          } else {
            setLoading(false)
            return
          }
        }
      }

      // Fallback mobile: descargar JPG + abrir WhatsApp nativo
      const objectUrl = URL.createObjectURL(blob)
      const a         = document.createElement('a')
      a.href          = objectUrl
      a.download      = fileName
      a.click()
      URL.revokeObjectURL(objectUrl)

      const waUrl = telefono
        ? `whatsapp://send?phone=54${telefono}&text=${mensaje}`
        : `whatsapp://send?text=${mensaje}`
      window.location.href = waUrl
    } else {
      // Desktop: descargar JPG + abrir WhatsApp Web en nueva pestaña
      const objectUrl = URL.createObjectURL(blob)
      const a         = document.createElement('a')
      a.href          = objectUrl
      a.download      = fileName
      a.click()
      URL.revokeObjectURL(objectUrl)

      const waUrl = telefono
        ? `https://web.whatsapp.com/send?phone=54${telefono}&text=${mensaje}`
        : `https://web.whatsapp.com/send?text=${mensaje}`
      window.open(waUrl, '_blank')
    }

    setLoading(false)
  }

  return { compartir, loading }
}
