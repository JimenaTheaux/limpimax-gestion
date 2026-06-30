import type { ClienteConSaldo, PedidoPendienteDetalle } from '@/services/produccion'

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short',
  })
}

function fmtMonto(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

interface Props {
  cliente: ClienteConSaldo
  pedidos: PedidoPendienteDetalle[]
}

const COLS = [
  { label: 'Pedido', w: 100, align: 'left'  as const },
  { label: 'Fecha',  w: 90,  align: 'left'  as const },
  { label: 'Total',  w: 100, align: 'right' as const },
  { label: 'Pagó',   w: 100, align: 'right' as const },
  { label: 'Debe',   w: 138, align: 'right' as const },
]

export function SaldoPendienteCanvas({ cliente, pedidos }: Props) {
  const total = pedidos.reduce((s, p) => s + p.pendiente, 0)

  return (
    <div
      style={{
        width:      600,
        background: '#ffffff',
        fontFamily: 'Inter, Arial, sans-serif',
        padding:    '32px 36px',
        boxSizing:  'border-box',
        color:      '#1A2B3C',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#1B9ED6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: -0.5 }}>LM</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#0D5C8A', letterSpacing: -0.3 }}>
              LIMPIMAX
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#4A5568' }}>Productos Químicos</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#E5E7EB', marginBottom: 20, width: '100%' }} />

      {/* Client info */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ color: '#4A5568', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Cliente
        </span>
        <p style={{ margin: '2px 0 4px', fontSize: 16, fontWeight: 700, color: '#1A2B3C' }}>
          {cliente.nombre}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#4A5568' }}>
          Detalle de saldo pendiente
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#E5E7EB', marginBottom: 16, width: '100%' }} />

      {/* Table */}
      <table style={{ width: 528, borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed', marginBottom: 0 }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid #D1D5DB' }}>
            {COLS.map(col => (
              <th key={col.label} style={{
                textAlign:      col.align,
                padding:        '4px 6px',
                fontWeight:     600,
                color:          '#4A5568',
                fontSize:       9,
                textTransform:  'uppercase',
                letterSpacing:  '0.06em',
                width:          col.w,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pedidos.map(p => (
            <tr key={p.id} style={{ borderBottom: '0.5px solid #F4F6F8' }}>
              <td style={{ padding: '8px 6px', fontSize: 12, fontWeight: 500, color: '#1A2B3C' }}>
                P-{String(p.numero).padStart(5, '0')}
              </td>
              <td style={{ padding: '8px 6px', fontSize: 11, color: '#4A5568' }}>
                {fmtFecha(p.fechaProduccion)}
              </td>
              <td style={{ padding: '8px 6px', fontSize: 12, textAlign: 'right', color: '#4A5568' }}>
                {fmtMonto(p.totalPedido)}
              </td>
              <td style={{ padding: '8px 6px', fontSize: 12, textAlign: 'right', color: '#4A5568' }}>
                {fmtMonto(p.sumaPagos)}
              </td>
              <td style={{ padding: '8px 6px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#D32F2F' }}>
                {fmtMonto(p.pendiente)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total adeudado */}
      <div style={{ marginTop: 16, borderTop: '1px solid #D1D5DB', paddingTop: 12, width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '0 6px',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A2B3C' }}>Total adeudado</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#F57C00' }}>
            {fmtMonto(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
