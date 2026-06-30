import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import html2canvas from 'html2canvas'
import { SaldoPendienteCanvas } from '@/components/pedidos/SaldoPendienteCanvas'
import type { ClienteConSaldo, PedidoPendienteDetalle } from '@/services/produccion'

function descargarBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const a         = document.createElement('a')
  a.href          = objectUrl
  a.download      = fileName
  document.body.appendChild(a)
  a.click()
  // Delay cleanup: remover inmediatamente cancela la descarga en Chromium/Edge
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  }, 2000)
}

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
      const root = createRoot(container)
      flushSync(() => {
        root.render(createElement(SaldoPendienteCanvas, { cliente, pedidos }))
      })

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

      // Fallback mobile: descargar primero, luego navegar a WhatsApp con delay
      descargarBlob(blob, fileName)
      const waUrl = telefono
        ? `whatsapp://send?phone=54${telefono}&text=${mensaje}`
        : `whatsapp://send?text=${mensaje}`
      setTimeout(() => { window.location.href = waUrl }, 1500)
    } else {
      // Desktop: descargar primero, luego abrir WhatsApp Web en nueva pestaña
      descargarBlob(blob, fileName)
      const waUrl = telefono
        ? `https://web.whatsapp.com/send?phone=54${telefono}&text=${mensaje}`
        : `https://web.whatsapp.com/send?text=${mensaje}`
      window.open(waUrl, '_blank')
    }
  }

  return { compartir }
}
