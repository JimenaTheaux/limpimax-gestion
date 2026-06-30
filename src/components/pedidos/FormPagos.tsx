import { IconPlus, IconX } from '@tabler/icons-react'
import type { PagoInput } from '@/services/pedidos'

interface Props {
  totalPedido: number
  pagos:       PagoInput[]
  onChange:    (pagos: PagoInput[]) => void
  compact?:    boolean
}

export function FormPagos({ totalPedido, pagos, onChange, compact = false }: Props) {
  const totalPagado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
  const diferencia  = totalPedido - totalPagado

  const update = (i: number, field: keyof PagoInput, value: string) => {
    const next = [...pagos]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  const add    = () => onChange([...pagos, { forma_pago: 'efectivo', monto: '' }])
  const remove = (i: number) => { if (pagos.length > 1) onChange(pagos.filter((_, idx) => idx !== i)) }

  const h  = compact ? 36 : 40
  const fs = compact ? 11 : 12

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
      {pagos.map((pago, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['efectivo', 'transferencia'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => update(i, 'forma_pago', f)}
              style={{
                padding: compact ? '5px 8px' : '7px 10px',
                borderRadius: 7, fontSize: fs, fontWeight: 500,
                border: `0.5px solid ${pago.forma_pago === f ? '#0D5C8A' : '#D1D5DB'}`,
                background: pago.forma_pago === f ? '#E8F4FF' : '#fff',
                color: pago.forma_pago === f ? '#0D5C8A' : '#4A5568',
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'Inter, sans-serif', flexShrink: 0,
              }}
            >
              {f === 'efectivo' ? 'Efectivo' : 'Transf.'}
            </button>
          ))}

          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={pago.monto}
            onChange={e => update(i, 'monto', e.target.value)}
            style={{
              flex: 1, height: h, padding: '0 10px',
              border: '0.5px solid #D1D5DB', borderRadius: 8,
              fontSize: 13, fontFamily: 'Inter, sans-serif',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#1B9ED6')}
            onBlur={e  => (e.target.style.borderColor = '#D1D5DB')}
          />

          {pagos.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Quitar pago ${i + 1}`}
              style={{
                padding: 4, background: 'none', border: 'none',
                cursor: 'pointer', color: '#D32F2F', flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
            >
              <IconX size={compact ? 14 : 16} />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
          background: 'none', border: '0.5px dashed #D1D5DB', borderRadius: 8,
          color: '#4A5568', fontSize: fs, fontWeight: 500,
          padding: compact ? '5px' : '7px',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}
      >
        <IconPlus size={12} />
        Agregar otro pago
      </button>

      {/* Resumen */}
      <div style={{
        background: '#F4F6F8', borderRadius: 8,
        padding: compact ? '8px 10px' : '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: compact ? 10 : 11, color: '#4A5568' }}>Total pedido</span>
          <span style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: '#1A2B3C' }}>
            ${totalPedido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: compact ? 10 : 11, color: '#4A5568' }}>Total pagado</span>
          <span style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: '#1A2B3C' }}>
            ${totalPagado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 2, paddingTop: 4, borderTop: '0.5px solid #D1D5DB',
        }}>
          <span style={{
            fontSize: compact ? 11 : 12, fontWeight: 600,
            color: diferencia === 0 ? '#145A32' : diferencia > 0 ? '#F57C00' : '#1565C0',
          }}>
            {diferencia === 0
              ? '✓ Pago completo'
              : diferencia > 0
              ? 'Queda pendiente'
              : 'A favor del cliente'}
          </span>
          {diferencia !== 0 && (
            <span style={{
              fontSize: compact ? 12 : 13, fontWeight: 700,
              color: diferencia > 0 ? '#F57C00' : '#1565C0',
            }}>
              ${Math.abs(diferencia).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
