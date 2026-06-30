import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import html2canvas from 'html2canvas'
import { SaldoPendienteCanvas } from '@/components/pedidos/SaldoPendienteCanvas'
import type { ClienteConSaldo, PedidoPendienteDetalle } from '@/services/produccion'

export function useCompartirSaldoPendiente() {
  const compartir = async (
    cliente: ClienteConSaldo,
    pedidos: PedidoPendienteDetalle[],
    onError?: (msg: string) => void,
  ) => {
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px;pointer-events:none'
    document.body.appendChild(container)

    let canvas: HTMLCanvasElement | null = null

    try {
      // Render sincrónico con flushSync para garantizar commit antes de capturar
      const root = createRoot(container)
      flushSync(() => {
        root.render(createElement(SaldoPendienteCanvas, { cliente, pedidos }))
      })

      // Esperar fuentes web (Inter) antes de capturar
      await document.fonts.ready

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
      return
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }

    if (!canvas) {
      onError?.('No se pudo generar la imagen. Intentá de nuevo.')
      return
    }

    let blob: Blob
    try {
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas!.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/jpeg', 0.95)
      )
    } catch (err) {
      console.error('useCompartirSaldoPendiente: error al convertir canvas a blob', err)
      onError?.('No se pudo generar la imagen. Intentá de nuevo.')
      return
    }

    const slug     = cliente.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const fileName = `saldo-${slug}.jpg`
    const file     = new File([blob], fileName, { type: 'image/jpeg' })

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
          return
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') {
            console.warn('useCompartirSaldoPendiente: share nativo falló, usando fallback', err)
          } else {
            return
          }
        }
      }

      // Fallback mobile: descargar JPG + abrir WhatsApp nativo
      const objectUrl = URL.createObjectURL(blob)
      const a         = document.createElement('a')
      a.href          = objectUrl
      a.download      = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
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
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

      const waUrl = telefono
        ? `https://web.whatsapp.com/send?phone=54${telefono}&text=${mensaje}`
        : `https://web.whatsapp.com/send?text=${mensaje}`
      window.open(waUrl, '_blank')
    }
  }

  return { compartir }
}
