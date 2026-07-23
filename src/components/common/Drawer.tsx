import { useEffect } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open:        boolean
  onClose:     () => void
  title:       string
  children:    React.ReactNode
  footer?:     React.ReactNode
  scrollRef?:  React.RefObject<HTMLDivElement | null>
  panelStyle?: React.CSSProperties
  /** Ancho del dialog en desktop (px). En mobile siempre es 100% independientemente de este valor. */
  width?:      number
}

export function Drawer({ open, onClose, title, children, footer, scrollRef, panelStyle, width }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Overlay — click fuera cierra */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 200,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="drawer-panel"
        style={{
          background: '#F4F6F8',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...(width ? ({ '--drawer-width': `${width}px` } as React.CSSProperties) : {}),
          ...panelStyle,
        }}
      >
        {/* Header sticky */}
        <div className="drawer-header" style={{
          background: '#fff',
          borderBottom: '0.5px solid #D1D5DB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A2B3C' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="btn-press"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#4A5568', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body scrollable */}
        <div
          ref={scrollRef}
          className="drawer-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: footer ? 8 : 'max(32px, calc(16px + env(safe-area-inset-bottom)))',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>

        {/* Footer fijo — botones siempre visibles aunque el teclado suba */}
        {footer && (
          <div className="drawer-footer" style={{
            background: '#fff',
            borderTop: '0.5px solid #D1D5DB',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            display: 'flex',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
