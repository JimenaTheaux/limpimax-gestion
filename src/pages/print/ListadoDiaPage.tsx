import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatearItem } from '@/types'

interface ItemDia {
  pedidoId:       string
  cantidad:       string
  descripcion:    string
  precioUnitario: string
}

interface PedidoDia {
  id:               string
  numero:           number
  estado:           string
  totalCalculado:   string
  totalManual:      string | null
  formaCobro:       string | null
  montoCobrado:     string | null
  notasProduccion:  string | null
  clienteId:        string
  clienteNombre:    string | null
  clienteTelefono:  string | null
  direccionEntrega: string | null
  items:            ItemDia[]
}

const ESTADOS_REPARTO = new Set(['listo_reparto', 'en_reparto', 'en_produccion'])

export default function ListadoDiaPage() {
  const [searchParams] = useSearchParams()
  const fechaInit = searchParams.get('fecha') ?? new Date().toISOString().split('T')[0]

  const [fecha,   setFecha]   = useState(fechaInit)
  const [pedidos, setPedidos] = useState<PedidoDia[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const cargar = async (f: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id, numero, estado, total_calculado, total_manual,
          forma_cobro, monto_cobrado, notas_produccion,
          cliente_id, direccion_entrega,
          clientes(nombre, telefono),
          pedido_items(
            cantidad, precio_unitario,
            producto_presentaciones(presentacion, productos(nombre)),
            fragancias(nombre)
          )
        `)
        .eq('fecha_produccion', f)
        .order('numero', { ascending: true })

      if (error) throw new Error(error.message)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: PedidoDia[] = (data ?? []).map((p: any) => ({
        id:               p.id,
        numero:           p.numero,
        estado:           p.estado,
        totalCalculado:   String(p.total_calculado ?? '0'),
        totalManual:      p.total_manual != null ? String(p.total_manual) : null,
        formaCobro:       p.forma_cobro,
        montoCobrado:     p.monto_cobrado != null ? String(p.monto_cobrado) : null,
        notasProduccion:  p.notas_produccion,
        clienteId:        p.cliente_id,
        clienteNombre:    p.clientes?.nombre ?? null,
        clienteTelefono:  p.clientes?.telefono ?? null,
        direccionEntrega: p.direccion_entrega,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (p.pedido_items ?? []).map((item: any): ItemDia => ({
          pedidoId:       p.id,
          cantidad:       String(item.cantidad),
          descripcion:    formatearItem(item),
          precioUnitario: String(item.precio_unitario ?? '0'),
        })),
      }))

      setPedidos(mapped.filter(p => ESTADOS_REPARTO.has(p.estado)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar(fecha) }, [fecha])

  useEffect(() => {
    if (!loading && pedidos.length > 0) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [loading, pedidos.length])

  const totalGeneral = pedidos.reduce(
    (s, p) => s + Number(p.totalManual ?? p.totalCalculado), 0,
  )

  const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; }
          .pedido-block { break-inside: avoid; }
        }
        @media screen {
          body { background: #f4f6f8; font-family: Arial, sans-serif; }
          .doc-wrapper { max-width: 760px; margin: 0 auto; background: white; padding: 24px 20px; min-height: 100vh; }
        }
      `}</style>

      {/* Barra de controles — no se imprime */}
      <div className="no-print" style={{
        background: '#1A2B3C', padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>LIMPIMAX — Listado del día</span>
        <input
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          style={{ height: 34, borderRadius: 8, border: 'none', padding: '0 10px', fontSize: 13 }}
        />
        <button
          onClick={() => cargar(fecha)}
          style={{
            height: 34, background: '#0D5C8A', color: '#fff', border: 'none',
            borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}
        >
          Actualizar
        </button>
        <button
          onClick={() => window.print()}
          style={{
            height: 34, background: '#2E9E5C', color: '#fff', border: 'none',
            borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}
        >
          🖨️ Imprimir / PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{
            height: 34, background: 'transparent', color: '#fff',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8,
            padding: '0 14px', cursor: 'pointer', fontSize: 13,
          }}
        >
          Cerrar
        </button>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 'auto' }}>
          {loading ? 'Cargando...' : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="doc-wrapper">
        {/* Encabezado */}
        <div style={{ borderBottom: '2px solid #0D5C8A', paddingBottom: 14, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0D5C8A', letterSpacing: -0.5 }}>LIMPIMAX</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Productos Químicos de Limpieza</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2B3C' }}>Listado de reparto</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2, textTransform: 'capitalize' }}>{fechaFormateada}</div>
            </div>
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>Cargando...</p>}
        {error   && <p style={{ color: 'red', padding: 16 }}>{error}</p>}

        {!loading && pedidos.length === 0 && (
          <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>
            No hay pedidos para reparto en esta fecha.
          </p>
        )}

        {/* Pedidos */}
        {pedidos.map((pedido, idx) => (
          <div key={pedido.id} className="pedido-block" style={{
            borderBottom: '1px solid #E2E8F0', paddingBottom: 18, marginBottom: 18,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: 16 }}>
                  P-{String(pedido.numero).padStart(5, '0')}
                </span>
                <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 15 }}>
                  {pedido.clienteNombre}
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#888' }}>#{idx + 1}</span>
            </div>

            {/* Dirección */}
            {pedido.direccionEntrega && (
              <div style={{
                fontSize: 15, fontWeight: 700, color: '#0D5C8A',
                marginBottom: 8, padding: '6px 10px',
                background: '#E8F4FF', borderRadius: 6,
              }}>
                📍 {pedido.direccionEntrega}
              </div>
            )}

            {pedido.clienteTelefono && (
              <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
                Tel: {pedido.clienteTelefono}
              </div>
            )}

            {/* Productos */}
            <div style={{ marginBottom: 10 }}>
              {pedido.items.map((item, i) => (
                <span key={i} style={{
                  display: 'inline-block', background: '#F0F0F0', color: '#333',
                  borderRadius: 4, padding: '2px 8px', margin: '2px', fontSize: 12,
                }}>
                  {item.descripcion} × <strong>{item.cantidad}</strong>
                </span>
              ))}
            </div>

            {pedido.notasProduccion && (
              <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 8 }}>
                Notas: {pedido.notasProduccion}
              </div>
            )}

            {/* Total */}
            <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 900, color: '#0D5C8A' }}>
              Total: ${Number(pedido.totalManual ?? pedido.totalCalculado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}

        {/* Total general */}
        {!loading && pedidos.length > 0 && (
          <div style={{
            marginTop: 8, padding: '12px 16px',
            background: '#0D5C8A', borderRadius: 8, color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>TOTAL A COBRAR</span>
            <span style={{ fontWeight: 900, fontSize: 20 }}>
              ${totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
