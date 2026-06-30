import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import html2canvas from 'html2canvas'
import { createElement } from 'react'
import { FacturaCanvas } from '@/components/pedidos/FacturaCanvas'
import type { PedidoDetalle } from '@/services/pedidos'
import { formatNumero } from '@/types'

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

export function useCompartirFactura() {
  const [loading, setLoading] = useState(false)

  const compartir = async (
    pedido: PedidoDetalle,
    onError?: (msg: string) => void,
  ) => {
    setLoading(true)

    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px;pointer-events:none'
    document.body.appendChild(container)

    let canvas: HTMLCanvasElement | null = null

    try {
      const root = createRoot(container)
      flushSync(() => {
        root.render(createElement(FacturaCanvas, { pedido }))
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
      console.error('useCompartirFactura: error al generar imagen', err)
      onError?.('No se pudo generar la imagen. Intentá de nuevo.')
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

    let blob: Blob
    try {
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas!.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/jpeg', 0.95)
      )
    } catch (err) {
      console.error('useCompartirFactura: error al convertir canvas a blob', err)
      onError?.('No se pudo generar la imagen. Intentá de nuevo.')
      setLoading(false)
      return
    }

    const numStr   = String(pedido.numero).padStart(5, '0')
    const fileName = `factura-P${numStr}.jpg`
    const file     = new File([blob], fileName, { type: 'image/jpeg' })
    const numero   = formatNumero(pedido.numero)

    const telefono = pedido.clientes?.telefono
      ?.replace(/\D/g, '')
      ?.replace(/^0/, '')
      ?.replace(/^54/, '') ?? ''

    const mensaje = encodeURIComponent(
      `Hola! Confirmamos el pedido! ${numero}. Adjuntamos la imagen con la factura.`
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
            title: `Factura ${numero}`,
          })
          setLoading(false)
          return
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') {
            console.warn('useCompartirFactura: share nativo falló, usando fallback', err)
          } else {
            setLoading(false)
            return
          }
        }
      }

      // Fallback mobile: descargar primero, luego navegar a WhatsApp con delay
      // para que la descarga se encole antes de que la página navegue
      descargarBlob(blob, fileName)
      const waUrl = telefono
        ? `whatsapp://send?phone=54${telefono}&text=${mensaje}`
        : `whatsapp://send?text=${mensaje}`
      setTimeout(() => { window.location.href = waUrl }, 1500)
    } else {
      // Desktop (incl. PWA instalada): descargar primero, luego abrir WA con delay.
      // En PWA standalone, window.open('_blank') puede navegar la ventana actual,
      // cancelando la descarga si se llama en el mismo tick.
      descargarBlob(blob, fileName)
      const waUrl = telefono
        ? `https://web.whatsapp.com/send?phone=54${telefono}&text=${mensaje}`
        : `https://web.whatsapp.com/send?text=${mensaje}`
      setTimeout(() => { window.open(waUrl, '_blank') }, 1500)
    }

    setLoading(false)
  }

  return { compartir, loading }
}
