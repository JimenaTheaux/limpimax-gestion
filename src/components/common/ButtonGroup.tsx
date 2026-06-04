interface Option<T extends string> {
  value:   T
  label:   string
  color?:  string  // color activo personalizado (hex)
}

interface ButtonGroupProps<T extends string> {
  label:    string
  options:  Option<T>[]
  value:    T
  onChange: (val: T) => void
  error?:   string
  disabled?: boolean
}

export function ButtonGroup<T extends string>({
  label, options, value, onChange, error, disabled,
}: ButtonGroupProps<T>) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: '#4A5568',
      }}>
        {label}
      </span>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(opt => {
          const isSelected = opt.value === value
          const activeColor = opt.color ?? '#0D5C8A'

          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              style={{
                flex:         1,
                minWidth:     80,
                minHeight:    44,
                padding:      '10px 14px',
                borderRadius: 10,
                border:       `1.5px solid ${isSelected ? activeColor : '#D1D5DB'}`,
                background:   isSelected ? activeColor : '#fff',
                color:        isSelected ? '#fff' : '#4A5568',
                fontSize:     14,
                fontWeight:   isSelected ? 600 : 400,
                cursor:       disabled ? 'not-allowed' : 'pointer',
                opacity:      disabled ? 0.5 : 1,
                transition:   'all 0.15s ease',
                fontFamily:   'Inter, sans-serif',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {error && (
        <p style={{ color: '#D32F2F', fontSize: 11, margin: '0 0 0 2px' }}>{error}</p>
      )}
    </div>
  )
}
