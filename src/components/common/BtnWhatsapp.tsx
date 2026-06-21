const WA_SVG = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ width: 14, height: 14, flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.112 1.528 5.836L.057 23.804a.5.5 0 00.608.65l6.08-1.433A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.52-5.16-1.427l-.36-.214-3.733.88.936-3.629-.235-.373A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
)

interface BtnWhatsappProps {
  onClick:       () => void
  loading?:      boolean
  disabled?:     boolean
  numeroLabel?:  string   // para aria-label
  variante?:     'icono' | 'pill'
}

export function BtnWhatsapp({
  onClick,
  loading   = false,
  disabled  = false,
  numeroLabel,
  variante  = 'icono',
}: BtnWhatsappProps) {
  const ariaLabel = `Compartir factura${numeroLabel ? ` del pedido ${numeroLabel}` : ''} por WhatsApp`
  const isDisabled = disabled || loading

  if (variante === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-label={ariaLabel}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            6,
          height:         36,
          padding:        '0 14px',
          borderRadius:   8,
          background:     isDisabled ? 'rgba(37,211,102,0.5)' : '#25D366',
          color:          '#fff',
          border:         'none',
          fontSize:       12,
          fontWeight:     500,
          cursor:         isDisabled ? 'not-allowed' : 'pointer',
          flexShrink:     0,
          transition:     'background 0.15s',
          whiteSpace:     'nowrap',
          fontFamily:     'Inter, sans-serif',
        }}
        onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = '#1ebe5a' }}
        onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = '#25D366' }}
      >
        {WA_SVG}
        {loading ? 'Generando…' : 'Compartir por WhatsApp'}
      </button>
    )
  }

  // variante "icono"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           28,
        height:          28,
        borderRadius:    6,
        background:      isDisabled ? '#F4F6F8' : 'transparent',
        border:          '0.5px solid #D1D5DB',
        cursor:          isDisabled ? 'not-allowed' : 'pointer',
        color:           isDisabled ? '#D1D5DB' : '#25D366',
        flexShrink:      0,
        transition:      'background 0.15s',
      }}
      onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = '#F0FDF4' }}
      onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {loading
        ? <span style={{ fontSize: 10, color: '#4A5568' }}>…</span>
        : WA_SVG
      }
    </button>
  )
}
