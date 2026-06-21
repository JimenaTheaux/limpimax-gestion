import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { createElement } from 'react'
import { FacturaCanvas } from '@/components/pedidos/FacturaCanvas'
import type { PedidoDetalle } from '@/services/pedidos'
import { formatNumero } from '@/types'

export function useCompartirFactura() {
  const [loading, setLoading] = useState(false)

  const compartir = async (
    pedido: PedidoDetalle,
    onError?: (msg: string) => void,
  ) => {
    setLoading(true)

    // 1. Montar FacturaCanvas en div oculto
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:600px;pointer-events:none'
    document.body.appendChild(container)

    let canvas: HTMLCanvasElement | null = null

    try {
      // 2. Renderizar el componente React en el container
      await new Promise<void>(resolve => {
        const root = createRoot(container)
        root.render(createElement(FacturaCanvas, { pedido }))
        // Esperar un tick para que React termine el render
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      // 3. Capturar con html2canvas
      canvas = await html2canvas(container, {
        scale:           2,
        useCORS:         true,
        backgroundColor: '#ffffff',
        width:           600,
        logging:         false,
      })
    } catch (err) {
      console.error('useCompartirFactura: error al generar imagen', err)
      onError?.('No se pudo generar la imagen')
      document.body.removeChild(container)
      setLoading(false)
      return
    } finally {
      // 4. Limpiar el container del DOM (siempre, éxito o fallo)
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }

    if (!canvas) {
      onError?.('No se pudo generar la imagen')
      setLoading(false)
      return
    }

    // 5. Convertir canvas a Blob JPG
    let blob: Blob
    try {
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas!.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/jpeg', 0.95)
      )
    } catch {
      onError?.('No se pudo generar la imagen')
      setLoading(false)
      return
    }

    const numStr  = String(pedido.numero).padStart(5, '0')
    const fileName = `factura-P${numStr}.jpg`
    const file     = new File([blob], fileName, { type: 'image/jpeg' })
    const numero   = formatNumero(pedido.numero)

    // 6. Compartir nativo (mobile) si está disponible
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
        // Si el usuario cancela el share nativo, no es error
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('useCompartirFactura: share nativo falló, usando fallback', err)
        } else {
          setLoading(false)
          return
        }
      }
    }

    // 7. Fallback desktop: descargar el JPG + abrir WhatsApp Web
    const objectUrl = URL.createObjectURL(blob)
    const a         = document.createElement('a')
    a.href          = objectUrl
    a.download      = fileName
    a.click()
    URL.revokeObjectURL(objectUrl)

    const telefono = pedido.clientes?.telefono?.replace(/\D/g, '') ?? ''
    const mensaje  = encodeURIComponent(
      `Hola! Te enviamos la factura del pedido ${numero} de LIMPIMAX. Adjuntamos la imagen.`
    )
    const waUrl = telefono
      ? `https://wa.me/54${telefono}?text=${mensaje}`
      : `https://wa.me/?text=${mensaje}`

    window.open(waUrl, '_blank')

    setLoading(false)
  }

  return { compartir, loading }
}
