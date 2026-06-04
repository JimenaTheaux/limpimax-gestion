import { forwardRef } from 'react'

interface FloatInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const FloatInput = forwardRef<HTMLInputElement, FloatInputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">
        <input ref={ref} className={`input ${className ?? ''}`} placeholder=" " {...props} />
        <span>{label}</span>
      </label>
      {error && (
        <p style={{ color: '#D32F2F', fontSize: 11, margin: '0 0 0 2px' }}>{error}</p>
      )}
    </div>
  )
)
FloatInput.displayName = 'FloatInput'
