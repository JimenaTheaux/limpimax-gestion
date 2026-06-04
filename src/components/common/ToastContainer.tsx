import { X } from 'lucide-react'

interface Toast {
  id:      number
  message: string
  type:    'success' | 'error' | 'info'
}

const STYLES = {
  success: { bg: '#E8F8F0', border: '#2E9E5C', color: '#2E9E5C' },
  error:   { bg: '#FDECEA', border: '#D32F2F', color: '#D32F2F' },
  info:    { bg: '#E8F4FF', border: '#1B9ED6', color: '#1B9ED6' },
}

interface Props {
  toasts:  Toast[]
  dismiss: (id: number) => void
}

export function ToastContainer({ toasts, dismiss }: Props) {
  if (!toasts.length) return null

  return (
    <div style={{
      position:      'fixed',
      bottom:        72,
      right:         16,
      zIndex:        300,
      display:       'flex',
      flexDirection: 'column',
      gap:           8,
      maxWidth:      320,
    }}>
      {toasts.map(t => {
        const s = STYLES[t.type]
        return (
          <div key={t.id} style={{
            background:   s.bg,
            border:       `1px solid ${s.border}`,
            borderRadius: 12,
            padding:      '12px 36px 12px 14px',
            fontSize:     13,
            fontWeight:   500,
            color:        s.color,
            position:     'relative',
            boxShadow:    '0 4px 16px rgba(0,0,0,0.10)',
            animation:    'slideUp 0.25s ease',
          }}>
            {t.message}
            <button
              onClick={() => dismiss(t.id)}
              style={{
                position:  'absolute', top: 8, right: 8,
                background:'transparent', border: 'none',
                cursor:    'pointer', color: s.color, padding: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
