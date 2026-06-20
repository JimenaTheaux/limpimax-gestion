import { CheckCircle, XCircle } from 'lucide-react'
import { BadgeEstado }  from '@/components/common/BadgeEstado'
import { Skeleton }     from '@/components/ui/skeleton'
import { usePedidos, totalPedido } from '@/services/pedidos'

export default function HistorialPage() {
  const HOY = new Date().toISOString().split('T')[0]
  const { data: pedidos, isLoading } = usePedidos({ fechaProduccion: HOY })

  const historial = pedidos?.filter(p =>
    ['entregado', 'cerrado', 'entrega_fallida'].includes(p.estado)
  ) ?? []

  const totalCobrado = historial
    .filter(p => p.forma_cobro && p.forma_cobro !== 'pendiente' && p.monto_cobrado)
    .reduce((acc, p) => acc + Number(p.monto_cobrado ?? 0), 0)

  return (
    <div>
      <h1 className="section-title" style={{ marginBottom: 20 }}>Historial del día</h1>

      {/* Resumen cobros */}
      {totalCobrado > 0 && (
        <div style={{
          background: '#E8F8F0', borderRadius: 14, padding: '12px 16px',
          marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#2E9E5C', fontWeight: 600 }}>Total cobrado hoy</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#2E9E5C', letterSpacing: -0.5 }}>
            ${totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => <Skeleton key={i} style={{ height: 80, borderRadius: 16 }} />)}
        </div>
      ) : !historial.length ? (
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <CheckCircle size={48} strokeWidth={1.2} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#1A2B3C', margin: 0 }}>Sin entregas registradas aún</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {historial.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: 16, padding: '14px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {p.estado === 'entrega_fallida'
                ? <XCircle size={20} color="#D32F2F" />
                : <CheckCircle size={20} color="#2E9E5C" />
              }
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>P-{String(p.numero).padStart(5, '0')}</span>
                  <BadgeEstado estado={p.estado} />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{p.clientes?.nombre}</p>
                {p.forma_cobro && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#4A5568' }}>
                    {p.forma_cobro === 'efectivo' ? '💵' : p.forma_cobro === 'transferencia' ? '🏦' : '⏳'} {p.forma_cobro}
                    {p.monto_cobrado ? ` — $${Number(p.monto_cobrado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : ''}
                  </p>
                )}
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, color: '#0D5C8A', letterSpacing: -0.5 }}>
                ${Number(totalPedido(p)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
