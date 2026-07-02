import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chart, registerables, type TooltipItem } from 'chart.js'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Clock, Package, Banknote, FlaskConical, BarChart2, ChevronDown, Loader2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { BadgeEstado } from '@/components/common/BadgeEstado'
import { useClientesConDeuda, useClientePendientes, fetchClientePendientes } from '@/services/produccion'
import type { ClienteConSaldo } from '@/services/produccion'
import { ESTADO_CONFIG, type EstadoPedido } from '@/types'
import { supabase } from '@/lib/supabase'
import { useCompartirSaldoPendiente } from '@/hooks/useCompartirSaldoPendiente'

Chart.register(...registerables)

// ─── Types ────────────────────────────────────────────────────────────────────

interface PedidoItemRow {
  cantidad:    number
  producto_id: string
  productos?:  {
    nombre:               string
    presentacion:         number
    fragancia:            string | null
    categorias_produto?: { nombre: string } | null
    categorias_produto2?: { nombre: string } | null
    categorias_producto?: { nombre: string } | null
  } | null
}

interface PedidoRow {
  id:               string
  estado:           EstadoPedido
  fecha_produccion: string | null
  pedido_items?:    PedidoItemRow[]
}

interface CobroRow {
  id:            string
  pedido_items?: { cantidad: number; costo_snapshot: number }[]
}

interface PagoRow {
  forma_pago: string
  monto:      number | string
  fecha_pago: string
}

type EgresoItem = {
  monto:        number | string
  categoria:    string
  fecha_egreso: string
}

interface BidonesRow {
  id:               string
  numero:           number
  fecha_produccion: string | null
  total_calculado:  number
  total_manual:     number | null
  costo_bidones:    number
  clientes:         { nombre: string } | null
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function primerDiaMes(): string {
  const hoy = new Date()
  return fmtDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
}

function restarUnMes(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00')
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Pedidos por created_at — para conteos y panel de estados
function usePedidosPeriodo(inicio: string, fin: string) {
  return useQuery({
    queryKey:        ['pedidos', 'dash-periodo', inicio, fin],
    placeholderData: keepPreviousData,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, estado, fecha_produccion, pedido_items(cantidad, producto_id, productos(nombre, presentacion, fragancia, categorias_producto(nombre)))')
        .gte('created_at', inicio)
        .lte('created_at', fin + 'T23:59:59')
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as PedidoRow[]
    },
    refetchInterval: 30_000,
    staleTime:       0,
  })
}

// Pedidos cerrados por fecha_cobro — sólo para costo de producción (costo_snapshot)
function useCobrosperiodo(inicio: string, fin: string) {
  return useQuery({
    queryKey:        ['pedidos', 'dash-cobros', inicio, fin],
    placeholderData: keepPreviousData,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, pedido_items(cantidad, costo_snapshot)')
        .eq('estado', 'cerrado')
        .gte('fecha_cobro', inicio)
        .lte('fecha_cobro', fin)
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as CobroRow[]
    },
    refetchInterval: 30_000,
    staleTime:       0,
  })
}

// Pagos reales por fecha_pago — fuente de verdad para KPIs de dinero cobrado
function usePagosPeriodo(inicio: string, fin: string) {
  return useQuery({
    queryKey:        ['pedido_pagos', 'dash', inicio, fin],
    placeholderData: keepPreviousData,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('pedido_pagos')
        .select('forma_pago, monto, fecha_pago')
        .gte('fecha_pago', inicio)
        .lte('fecha_pago', fin)
      if (error) throw new Error(error.message)
      return (data ?? []) as PagoRow[]
    },
    refetchInterval: 30_000,
    staleTime:       0,
  })
}

// Chart: cubre período actual + mes anterior, agrupado por fecha_pago de pedido_pagos
function useEvolucionRango(desde: string, hasta: string) {
  const mesAnteriorDesde = restarUnMes(desde)
  return useQuery({
    queryKey:        ['pedido_pagos', 'dash-evolucion', desde, hasta],
    placeholderData: keepPreviousData,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('pedido_pagos')
        .select('monto, fecha_pago')
        .gte('fecha_pago', mesAnteriorDesde)
        .lte('fecha_pago', hasta)
      if (error) throw new Error(error.message)
      return (data ?? []) as PagoRow[]
    },
    refetchInterval: 30_000,
    staleTime:       0,
  })
}

function useEgresosDashboard(desde: string, hasta: string) {
  return useQuery({
    queryKey:        ['dashboard-egresos', desde, hasta],
    placeholderData: keepPreviousData,
    queryFn:  async () => {
      const { data } = await supabase
        .from('egresos')
        .select('monto, categoria, fecha_egreso')
        .gte('fecha_egreso', desde)
        .lte('fecha_egreso', hasta)
      return (data ?? []) as EgresoItem[]
    },
    staleTime: 1000 * 60 * 3,
  })
}

function useBidonesPeriodo(inicio: string, fin: string) {
  return useQuery({
    queryKey:        ['pedidos', 'dash-bidones', inicio, fin],
    placeholderData: keepPreviousData,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, fecha_produccion, total_calculado, total_manual, costo_bidones, clientes(nombre)')
        .gt('costo_bidones', 0)
        .gte('created_at', inicio)
        .lte('created_at', fin + 'T23:59:59')
        .order('fecha_produccion', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(row => ({
        ...row,
        total_calculado: Number((row as any).total_calculado ?? 0),
        total_manual:    (row as any).total_manual != null ? Number((row as any).total_manual) : null,
        costo_bidones:   Number((row as any).costo_bidones ?? 0),
        clientes:        (row as any).clientes ?? null,
      })) as BidonesRow[]
    },
    refetchInterval: 30_000,
    staleTime:       0,
  })
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

// Pedidos por fecha_produccion: conteos y distribución de estados
function calcKPIs(pedidos: PedidoRow[]) {
  const pendCierre = pedidos.filter(p => !['cerrado', 'anulado'].includes(p.estado)).length
  const porEstado: Record<string, number> = {}
  for (const p of pedidos) porEstado[p.estado] = (porEstado[p.estado] || 0) + 1
  return { pendCierre, porEstado, count: pedidos.length }
}

// Pagos reales: totales de dinero cobrado por forma_pago
function calcCobrosKPI(pagos: PagoRow[]) {
  const totalCob = pagos.reduce((a, p) => a + Number(p.monto), 0)
  const totalEf  = pagos.filter(p => p.forma_pago === 'efectivo')
                        .reduce((a, p) => a + Number(p.monto), 0)
  const totalTr  = pagos.filter(p => p.forma_pago === 'transferencia')
                        .reduce((a, p) => a + Number(p.monto), 0)
  return { totalCob, totalEf, totalTr }
}

function calcEvolucionRango(pagos: PagoRow[], desde: string, hasta: string) {
  const mesAnteriorDesde = restarUnMes(desde)

  const dDesde    = new Date(desde + 'T12:00:00')
  const dHasta    = new Date(hasta + 'T12:00:00')
  const totalDays = Math.round((dHasta.getTime() - dDesde.getTime()) / 86_400_000) + 1
  const porDia    = totalDays <= 31

  const byDia: Record<string, number> = {}
  for (const p of pagos) {
    if (!p.fecha_pago) continue
    byDia[p.fecha_pago] = (byDia[p.fecha_pago] || 0) + Number(p.monto)
  }

  const labels:   string[] = []
  const actual:   number[] = []
  const anterior: number[] = []

  if (porDia) {
    for (let i = 0; i < totalDays; i++) {
      const keyA = addDays(desde, i)
      const keyP = addDays(mesAnteriorDesde, i)
      const dA   = new Date(keyA + 'T12:00:00')
      labels.push(`${String(dA.getDate()).padStart(2, '0')}/${String(dA.getMonth() + 1).padStart(2, '0')}`)
      actual.push(byDia[keyA] || 0)
      anterior.push(byDia[keyP] || 0)
    }
  } else {
    const chunkSize = 7
    const numChunks = Math.ceil(totalDays / chunkSize)
    for (let i = 0; i < numChunks; i++) {
      const startA = addDays(desde, i * chunkSize)
      const startP = addDays(mesAnteriorDesde, i * chunkSize)
      const dA     = new Date(startA + 'T12:00:00')
      labels.push(`${String(dA.getDate()).padStart(2, '0')}/${String(dA.getMonth() + 1).padStart(2, '0')}`)
      let sumA = 0, sumP = 0
      for (let j = 0; j < chunkSize; j++) {
        sumA += byDia[addDays(startA, j)] || 0
        sumP += byDia[addDays(startP, j)] || 0
      }
      actual.push(sumA)
      anterior.push(sumP)
    }
  }

  return { labels, actual, anterior }
}

function fmtRango(desde: string, hasta: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  const d = new Date(desde + 'T12:00:00').toLocaleDateString('es-AR', opts)
  const h = new Date(hasta + 'T12:00:00').toLocaleDateString('es-AR', opts)
  return `${d} — ${h}`
}

function calcTopProductos(pedidos: PedidoRow[]) {
  const acc: Record<string, { nombre: string; presentacion: number; fragancia: string | null; total: number }> = {}
  for (const p of pedidos) {
    if (p.estado !== 'cerrado') continue
    for (const item of p.pedido_items ?? []) {
      const key = item.producto_id
      if (!acc[key]) acc[key] = {
        nombre:       item.productos?.nombre       ?? '—',
        presentacion: item.productos?.presentacion ?? 0,
        fragancia:    item.productos?.fragancia    ?? null,
        total:        0,
      }
      acc[key].total += Number(item.cantidad)
    }
  }
  return Object.values(acc).sort((a, b) => b.total - a.total).slice(0, 5)
}

function calcTopCategorias(pedidos: PedidoRow[]): { nombre: string; total: number }[] {
  const acc: Record<string, number> = {}
  for (const p of pedidos) {
    if (p.estado !== 'cerrado') continue
    for (const item of p.pedido_items ?? []) {
      const cat = item.productos?.categorias_producto?.nombre ?? 'Sin categoría'
      acc[cat] = (acc[cat] ?? 0) + Number(item.cantidad)
    }
  }
  return Object.entries(acc)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

function pesos(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function calcEgresos(egresos: EgresoItem[]) {
  const total = egresos.reduce((s, e) => s + Number(e.monto), 0)
  const byCateg: Record<string, number> = {}
  for (const e of egresos) {
    byCateg[e.categoria] = (byCateg[e.categoria] || 0) + Number(e.monto)
  }
  const top2 = Object.entries(byCateg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
  return { total, top2 }
}

function calcTotalCostoProduccion(cobros: CobroRow[]): number {
  return cobros.reduce((sum, pedido) =>
    sum + (pedido.pedido_items ?? []).reduce((s, item) =>
      s + item.cantidad * item.costo_snapshot, 0
    ), 0
  )
}

// ─── GraficoLinea ─────────────────────────────────────────────────────────────

function GraficoLinea({ labels, actual, anterior }: {
  labels:   string[]
  actual:   number[]
  anterior: number[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label:                'Período actual',
            data:                 actual,
            borderColor:          '#0D5C8A',
            borderWidth:          1.5,
            pointRadius:          2,
            pointBackgroundColor: '#0D5C8A',
            tension:              0.4,
            fill:                 false,
          },
          {
            label:       'Mes anterior',
            data:        anterior,
            borderColor: '#D1D5DB',
            borderWidth: 1,
            pointRadius: 0,
            tension:     0.4,
            borderDash:  [3, 3],
            fill:        false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: TooltipItem<'line'>) =>
                ` ${c.dataset.label}: $${(c.parsed.y ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
            },
          },
        },
        scales: {
          x: {
            grid:   { display: false },
            ticks:  { font: { size: 10, family: 'Inter' }, color: '#9CA3AF' },
            border: { display: false },
          },
          y: { display: false },
        },
      },
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [labels, actual, anterior])

  return (
    <div style={{ height: 100, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ─── WA icon ──────────────────────────────────────────────────────────────────

const WA_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.112 1.528 5.836L.057 23.804a.5.5 0 00.608.65l6.08-1.433A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.52-5.16-1.427l-.36-.214-3.733.88.936-3.629-.235-.373A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
)

// ─── CardClienteDeudor ────────────────────────────────────────────────────────

function CardClienteDeudor({ cliente }: { cliente: ClienteConSaldo }) {
  const [expanded,     setExpanded]    = useState(false)
  const [sharing,      setSharing]     = useState(false)
  const [shareError,   setShareError]  = useState<string | null>(null)
  const { data: pedidos = [], isLoading } = useClientePendientes(expanded ? cliente.id : null)
  const { compartir } = useCompartirSaldoPendiente()

  const handleWhatsapp = async () => {
    setSharing(true)
    setShareError(null)
    try {
      const pendientes = await fetchClientePendientes(cliente.id)
      await compartir(cliente, pendientes, msg => setShareError(msg))
    } catch {
      setShareError('No se pudo generar la imagen. Intentá de nuevo.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderLeft: '3px solid #F9A825',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1A2B3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cliente.nombre}
          </p>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#F57C00', letterSpacing: -0.5 }}>
            {pesos(cliente.saldo_pendiente)}
          </span>
          <button
            onClick={e => { e.stopPropagation(); void handleWhatsapp() }}
            disabled={sharing}
            aria-label={`Compartir saldo pendiente de ${cliente.nombre} por WhatsApp`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              border: '0.5px solid #D1D5DB', color: '#25D366',
              background: 'transparent', cursor: sharing ? 'default' : 'pointer',
              flexShrink: 0, transition: 'background 0.15s', padding: 0,
            }}
            onMouseEnter={e => { if (!sharing) e.currentTarget.style.background = '#F0FDF4' }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {sharing
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : WA_SVG
            }
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '5px 10px', fontSize: 11, fontWeight: 500,
              borderRadius: 6, border: '0.5px solid #D1D5DB',
              background: expanded ? '#F4F6F8' : 'transparent',
              color: '#1B9ED6', cursor: 'pointer', whiteSpace: 'nowrap',
              minHeight: 28, fontFamily: 'Inter, sans-serif',
            }}
          >
            {expanded ? 'Ocultar' : 'Ver detalle'}
            <ChevronDown size={11} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
          </button>
        </div>
      </div>

      {/* Error al compartir */}
      {shareError && (
        <div style={{ padding: '0 16px 10px', fontSize: 11, color: '#D32F2F' }}>
          {shareError}
        </div>
      )}

      {/* Expandable pedidos detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F4F6F8', padding: '10px 16px 14px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton style={{ height: 20, borderRadius: 4 }} />
              <Skeleton style={{ height: 20, borderRadius: 4 }} />
            </div>
          ) : pedidos.length === 0 ? (
            <p style={{ fontSize: 12, color: '#4A5568', margin: 0 }}>Sin pedidos pendientes registrados</p>
          ) : (
            <div>
              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 52px 1fr 1fr 1fr', gap: 8, paddingBottom: 6 }}>
                {['Pedido', 'Fecha', 'Total', 'Pagó', 'Debe'].map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>
                    {h}
                  </span>
                ))}
              </div>
              {pedidos.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '80px 52px 1fr 1fr 1fr',
                    gap: 8, paddingTop: 7, paddingBottom: 7,
                    borderTop: '0.5px solid #F4F6F8',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C' }}>
                    P-{String(p.numero).padStart(5, '0')}
                  </span>
                  <span style={{ fontSize: 11, color: '#4A5568' }}>
                    {p.fechaProduccion
                      ? new Date(p.fechaProduccion + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
                      : '—'
                    }
                  </span>
                  <span style={{ fontSize: 12, color: '#4A5568' }}>{pesos(p.totalPedido)}</span>
                  <span style={{ fontSize: 12, color: '#4A5568' }}>{pesos(p.sumaPagos)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#D32F2F' }}>{pesos(p.pendiente)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SheetClientesDeudores ────────────────────────────────────────────────────

function SheetClientesDeudores({ open, onClose }: {
  open:    boolean
  onClose: () => void
}) {
  const { data: clientes = [], isLoading } = useClientesConDeuda()
  const total = clientes.reduce((s, c) => s + c.saldo_pendiente, 0)

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        <SheetHeader style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
          <SheetTitle style={{ fontSize: 16 }}>Pendientes de cobro</SheetTitle>
          {clientes.length > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4A5568' }}>
              {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} con saldo pendiente
            </p>
          )}
        </SheetHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: 60, borderRadius: 16 }} />)}
            </div>
          ) : clientes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>✓</p>
              <p style={{ fontWeight: 500, fontSize: 15, color: '#1A2B3C', margin: 0 }}>Todo al día</p>
              <p style={{ fontSize: 13, color: '#4A5568', margin: '4px 0 0' }}>No hay saldos pendientes</p>
            </div>
          ) : clientes.map(c => (
            <CardClienteDeudor key={c.id} cliente={c} />
          ))}
        </div>

        {clientes.length > 0 && (
          <div style={{
            flexShrink: 0, padding: '16px 24px',
            borderTop: '1px solid #E5E7EB', background: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#4A5568' }}>Total pendiente</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#F57C00', letterSpacing: -0.5 }}>
              {pesos(total)}
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Estados a mostrar en el panel ────────────────────────────────────────────

const ESTADOS_PANEL: EstadoPedido[] = [
  'en_produccion', 'listo_reparto', 'en_reparto', 'cerrado', 'entrega_fallida',
]

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()

  const [desde,     setDesde]    = useState<string>(primerDiaMes())
  const [hasta,     setHasta]    = useState<string>(fmtDate(new Date()))
  const [sheetPend, setSheetPend] = useState(false)
  const [topVer,    setTopVer]   = useState<'producto' | 'categoria'>('producto')

  // Pedidos por fecha_produccion (conteos, estados)
  const { data: pedidos,    isLoading } = usePedidosPeriodo(desde, hasta)
  // Pedidos cerrados por fecha_cobro — sólo para costo de producción
  const { data: cobros }                = useCobrosperiodo(desde, hasta)
  // Pagos reales por fecha_pago — fuente de verdad para KPIs de dinero
  const { data: pagos }                 = usePagosPeriodo(desde, hasta)
  // Clientes con saldo_pendiente > 0 (para KPI y drawer)
  const { data: clientesDeuda = [] }    = useClientesConDeuda()
  const { data: evolData }              = useEvolucionRango(desde, hasta)
  const { data: egresosData, isLoading: isLoadingEgresos } = useEgresosDashboard(desde, hasta)
  const { data: bidones = [] }                              = useBidonesPeriodo(desde, hasta)

  const kpi       = pedidos ? calcKPIs(pedidos)    : null
  const kpiCobros = pagos   ? calcCobrosKPI(pagos) : null
  const evolucion = evolData ? calcEvolucionRango(evolData, desde, hasta) : null

  const totalPendienteClientes = clientesDeuda.reduce((s, c) => s + c.saldo_pendiente, 0)

  const kpiEgresos           = egresosData ? calcEgresos(egresosData) : null
  const totalEgresos         = kpiEgresos?.total ?? 0
  const totalCostoProduccion = cobros ? calcTotalCostoProduccion(cobros) : 0
  const gananciaNeta         = (kpiCobros?.totalCob ?? 0) - totalCostoProduccion - totalEgresos

  const todayStr = fmtDate(new Date())

  const fechaDisplay = (() => {
    const f = new Date().toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    return f.charAt(0).toUpperCase() + f.slice(1)
  })()

  const handleDesde = (val: string) => {
    if (!val) return
    if (val > hasta) { setDesde(hasta); setHasta(val) }
    else setDesde(val)
  }

  const handleHasta = (val: string) => {
    if (!val) return
    if (val < desde) { setDesde(val); setHasta(desde) }
    else setHasta(val)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48 }}>
          <Skeleton style={{ height: 14, width: 72, borderRadius: 4 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton style={{ height: 32, width: 120, borderRadius: 6 }} />
            <Skeleton style={{ height: 32, width: 120, borderRadius: 6 }} />
            <Skeleton style={{ height: 32, width: 112, borderRadius: 6 }} />
          </div>
        </div>
        <Skeleton style={{ height: 14, width: 200, borderRadius: 4 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3].map(i => <Skeleton key={i} style={{ height: 104, borderRadius: 20 }} />)}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-2/3 lg:mx-auto">
            {[4,5].map(i => <Skeleton key={i} style={{ height: 104, borderRadius: 20 }} />)}
          </div>
        </div>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-3">
          <Skeleton style={{ height: 240, borderRadius: 10 }} />
          <Skeleton style={{ height: 240, borderRadius: 10 }} />
        </div>
      </div>
    )
  }

  const kpiCard = {
    background: '#fff', border: '0.5px solid #D1D5DB', borderRadius: 10, padding: '14px 16px',
  }
  const kpiHeaderRow = {
    display: 'flex', alignItems: 'center', gap: '5px', marginBottom: 10,
  }
  const kpiLabelSt = {
    fontSize: 9, fontWeight: 500 as const, color: '#4A5568',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
  }
  const kpiValueSt = {
    fontSize: 28, fontWeight: 500 as const, color: '#1A2B3C', letterSpacing: '-0.5px', lineHeight: 1,
  }
  const kpiSubSt = {
    margin: '6px 0 0', fontSize: 12, fontWeight: 400 as const, color: '#4A5568',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Topbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 48, flexWrap: 'wrap', gap: 8,
      }}>
        <h1 className="section-title">Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="date"
            value={desde}
            onChange={e => handleDesde(e.target.value)}
            style={{
              height: 32, border: '0.5px solid #D1D5DB', borderRadius: 6,
              padding: '0 10px', fontSize: 11, fontFamily: 'Inter, sans-serif',
              color: '#1A2B3C', background: '#fff', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#1B9ED6')}
            onBlur={e  => (e.target.style.borderColor = '#D1D5DB')}
          />
          <input
            type="date"
            value={hasta}
            onChange={e => handleHasta(e.target.value)}
            style={{
              height: 32, border: '0.5px solid #D1D5DB', borderRadius: 6,
              padding: '0 10px', fontSize: 11, fontFamily: 'Inter, sans-serif',
              color: '#1A2B3C', background: '#fff', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#1B9ED6')}
            onBlur={e  => (e.target.style.borderColor = '#D1D5DB')}
          />
          <button
            onClick={() => window.open(`/print/listado?fecha=${todayStr}`, '_blank')}
            style={{
              height: 32, padding: '0 12px', fontSize: 11, fontWeight: 500,
              color: '#4A5568', background: '#fff',
              border: '0.5px solid #D1D5DB', borderRadius: 6,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Listado del día
          </button>
        </div>
      </div>

      {/* ── Fecha del día ── */}
      <p style={{ margin: 0, fontSize: 12, fontWeight: 400, color: '#4A5568' }}>
        {fechaDisplay}
      </p>

      {/* ── KPIs ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Fila 1: Pedidos · Cobrado (desglose) · Pend. cobro · Costo producción */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_1fr] gap-2.5">

          {/* Card 1 — Pedidos */}
          <div style={kpiCard}>
            <div style={kpiHeaderRow}>
              <Package size={13} style={{ color: '#1B9ED6', flexShrink: 0 }} />
              <span style={kpiLabelSt}>Pedidos</span>
            </div>
            <div style={kpiValueSt}>{kpi?.count ?? 0}</div>
            <p style={kpiSubSt}>{kpi?.pendCierre ?? 0} pendiente(s) de cierre</p>
          </div>

          {/* Card 2 — Total cobrado (desglose Efectivo / Transferencia) */}
          <div style={kpiCard}>
            <div style={kpiHeaderRow}>
              <Banknote size={13} style={{ color: '#1B9ED6', flexShrink: 0 }} />
              <span style={kpiLabelSt}>Total cobrado</span>
            </div>
            <div style={kpiValueSt}>{pesos(kpiCobros?.totalCob ?? 0)}</div>
            <div style={{ display: 'flex', marginTop: 8 }}>
              <div style={{ flex: 1, borderRight: '0.5px solid #F4F6F8', paddingRight: 10 }}>
                <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#4A5568', marginBottom: 2 }}>Efectivo</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C' }}>{pesos(kpiCobros?.totalEf ?? 0)}</div>
              </div>
              <div style={{ flex: 1, paddingLeft: 10 }}>
                <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#4A5568', marginBottom: 2 }}>Transf.</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C' }}>{pesos(kpiCobros?.totalTr ?? 0)}</div>
              </div>
            </div>
          </div>

          {/* Card 3 — Pendiente de cobro (por saldo de clientes) */}
          <button
            onClick={() => { if (clientesDeuda.length > 0) setSheetPend(true) }}
            style={{
              ...kpiCard,
              display: 'block', width: '100%',
              border: '0.5px solid #F9D9A0',
              cursor: clientesDeuda.length > 0 ? 'pointer' : 'default',
              textAlign: 'left', fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={kpiHeaderRow}>
              <Clock size={13} style={{ color: '#F9A825', flexShrink: 0 }} />
              <span style={kpiLabelSt}>Pend. de cobro</span>
            </div>
            <div style={{ ...kpiValueSt, color: '#F9A825' }}>{pesos(totalPendienteClientes)}</div>
            <p style={{ ...kpiSubSt, color: '#1B9ED6', fontWeight: 600 }}>
              {clientesDeuda.length > 0
                ? `${clientesDeuda.length} cliente${clientesDeuda.length !== 1 ? 's' : ''} · Ver →`
                : 'Todo al día'
              }
            </p>
          </button>

          {/* Card 4 — Costo de producción */}
          <div style={kpiCard}>
            <div style={kpiHeaderRow}>
              <FlaskConical size={13} style={{ color: '#1B9ED6', flexShrink: 0 }} />
              <span style={kpiLabelSt}>Costo prod.</span>
            </div>
            <div style={{ ...kpiValueSt, color: '#1B9ED6' }}>{pesos(totalCostoProduccion)}</div>
            <p style={kpiSubSt}>ventas cobradas</p>
          </div>

        </div>

        {/* Barra Ganancia neta — full width */}
        <div
          style={{
            background: '#fff', border: '0.5px solid #D1D5DB', borderRadius: 10,
            padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
          aria-label={`KPI: Ganancia neta del período, ${pesos(gananciaNeta)}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={13} style={{ color: '#1A2B3C', flexShrink: 0 }} />
            <span style={kpiLabelSt}>Ganancia neta</span>
            {isLoadingEgresos ? (
              <Skeleton style={{ height: 22, width: 100, borderRadius: 4 }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 500, color: gananciaNeta >= 0 ? '#2E9E5C' : '#D32F2F', letterSpacing: '-0.5px' }}>
                {pesos(gananciaNeta)}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#4A5568' }}>Egresos {pesos(totalEgresos)}</span>
        </div>

      </div>

      {/* ── Panel inferior — Evolución (span 2) + Estado de pedidos (340px) ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_340px] gap-2.5">

        {/* Panel izquierdo — Evolución de cobros (por fecha_cobro) */}
        <div style={{ background: '#fff', border: '0.5px solid #D1D5DB', borderRadius: 10, overflow: 'hidden', gridColumn: 'span 2' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #F4F6F8' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C', letterSpacing: '-0.3px' }}>
              Evolución de ventas
            </span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <span style={{ fontSize: 20, fontWeight: 500, color: '#1A2B3C', letterSpacing: '-0.5px' }}>
              {pesos(kpiCobros?.totalCob ?? 0)}
            </span>
            {/* Leyenda custom */}
            <div style={{ display: 'flex', gap: 14, marginTop: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#0D5C8A' }} />
                <span style={{ fontSize: 10, color: '#4A5568' }}>Período actual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 14, height: 2, borderRadius: 1,
                  background: 'repeating-linear-gradient(90deg, #D1D5DB 0, #D1D5DB 3px, transparent 3px, transparent 6px)',
                }} />
                <span style={{ fontSize: 10, color: '#4A5568' }}>Mes anterior</span>
              </div>
            </div>
            {evolucion ? (
              <GraficoLinea
                labels={evolucion.labels}
                actual={evolucion.actual}
                anterior={evolucion.anterior}
              />
            ) : (
              <div style={{ height: 100, background: '#F4F6F8', borderRadius: 6 }} />
            )}
          </div>
        </div>

        {/* Panel derecho — Estado de pedidos (por fecha_produccion) */}
        <div style={{ background: '#fff', border: '0.5px solid #D1D5DB', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #F4F6F8' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C', letterSpacing: '-0.3px' }}>
              Estado de pedidos
            </span>
          </div>
          <div>
            {(() => {
              const porEst   = kpi?.porEstado ?? {}
              const visible  = ESTADOS_PANEL.filter(e =>
                e === 'entrega_fallida' ? (porEst[e] ?? 0) > 0 : true
              )
              const maxCount = Math.max(1, ...visible.map(e => porEst[e] ?? 0))

              if (visible.every(e => !(porEst[e] ?? 0))) {
                return (
                  <p style={{ fontSize: 13, color: '#4A5568', textAlign: 'center', padding: '28px 16px' }}>
                    Sin pedidos en el período
                  </p>
                )
              }

              return visible.map((estado, i) => {
                const count  = porEst[estado] ?? 0
                const cfg    = ESTADO_CONFIG[estado]
                const pct    = (count / maxCount) * 100
                const isLast = i === visible.length - 1

                return (
                  <button
                    key={estado}
                    onClick={() => navigate('/admin/pedidos')}
                    style={{
                      width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '9px 16px',
                      borderBottom: isLast ? 'none' : '0.5px solid #F4F6F8',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <BadgeEstado estado={estado} />
                    <div style={{ flex: 1, height: 3, borderRadius: 99, background: '#F4F6F8' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        borderRadius: 99, background: cfg.color,
                        transition: 'width 0.4s ease',
                        minWidth: count > 0 ? 4 : 0,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C', minWidth: 20, textAlign: 'right' }}>
                      {count}
                    </span>
                  </button>
                )
              })
            })()}
          </div>
        </div>
      </div>

      {/* ── Más vendidos + Detalle de bidones — 2 columnas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">

      {/* ── Top 5 más vendidos ── */}
      {(() => {
        const topProds = pedidos ? calcTopProductos(pedidos)  : []
        const topCats  = pedidos ? calcTopCategorias(pedidos) : []
        const lista    = topVer === 'producto' ? topProds : topCats
        const maxU     = lista[0]?.total ?? 1
        const vacia    = lista.length === 0

        const btnToggle = (ver: 'producto' | 'categoria', label: string) => (
          <button
            key={ver}
            onClick={() => setTopVer(ver)}
            style={{
              padding: '3px 9px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 500, fontFamily: 'Inter, sans-serif',
              background: topVer === ver ? '#fff' : 'transparent',
              color:      topVer === ver ? '#1A2B3C' : '#9CA3AF',
              boxShadow:  topVer === ver ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.12s',
            }}
          >
            {label}
          </button>
        )

        return (
          <div style={{ background: '#fff', border: '0.5px solid #D1D5DB', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #F4F6F8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C' }}>Más vendidos</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Toggle */}
                <div style={{ display: 'flex', background: '#F4F6F8', borderRadius: 6, padding: 2, gap: 2 }}>
                  {btnToggle('producto',  'Productos')}
                  {btnToggle('categoria', 'Categorías')}
                </div>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>{fmtRango(desde, hasta)}</span>
              </div>
            </div>

            {/* Filas */}
            {vacia ? (
              <p style={{ fontSize: 12, color: '#4A5568', textAlign: 'center', padding: 16, margin: 0 }}>
                Sin ventas en el período seleccionado
              </p>
            ) : lista.map((item, i) => (
              <div
                key={item.nombre + i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 16px',
                  borderBottom: i < lista.length - 1 ? '0.5px solid #F4F6F8' : 'none',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', minWidth: 16 }}>
                  {i + 1}
                </span>

                {/* Nombre + badges */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.nombre}
                  </span>
                  {topVer === 'producto' && (() => {
                    const p = item as typeof topProds[0]
                    return (
                      <>
                        {p.fragancia && (
                          <span style={{ fontSize: 9, color: '#0D5C8A', background: '#E8F4FF', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
                            {p.fragancia}
                          </span>
                        )}
                        {p.presentacion > 0 && (
                          <span style={{ fontSize: 9, color: '#4A5568', background: '#F4F6F8', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
                            {p.presentacion} L
                          </span>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Total */}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#0D5C8A', minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                  {item.total} u.
                </span>

                {/* Barra */}
                <div style={{ width: 80, height: 3, borderRadius: 99, background: '#F4F6F8', flexShrink: 0 }}>
                  <div style={{
                    width: `${(item.total / maxU) * 100}%`,
                    height: '100%', borderRadius: 99, background: '#0D5C8A',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Detalle de bidones ── */}
      {bidones.length > 0 && (() => {
        const fmtP = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

        const exportarBidones = () => {
          const rows = bidones.map(p => ({
            'N° Pedido':        `P-${String(p.numero).padStart(5, '0')}`,
            'Fecha':            p.fecha_produccion ?? '',
            'Cliente':          p.clientes?.nombre ?? '—',
            'Total pedido':     p.total_manual ?? p.total_calculado,
            'Costo bidones':    p.costo_bidones,
            'Total sin bidones': (p.total_manual ?? p.total_calculado) - p.costo_bidones,
          }))
          const ws = XLSX.utils.json_to_sheet(rows)
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, 'Bidones')
          XLSX.writeFile(wb, `bidones-${desde}-${hasta}.xlsx`)
        }

        const sumTotal    = bidones.reduce((s, p) => s + (p.total_manual ?? p.total_calculado), 0)
        const sumBidones  = bidones.reduce((s, p) => s + p.costo_bidones, 0)
        const sumSinBid   = sumTotal - sumBidones

        return (
          <div style={{ background: '#fff', border: '0.5px solid #D1D5DB', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #F4F6F8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C' }}>Detalle de bidones</span>
              <button
                onClick={exportarBidones}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 28, padding: '0 10px', fontSize: 11, fontWeight: 500,
                  color: '#0D5C8A', background: '#EEF4FA',
                  border: '0.5px solid #BDD4EA', borderRadius: 6,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#D8E9F7')}
                onMouseLeave={e => (e.currentTarget.style.background = '#EEF4FA')}
              >
                <Download size={12} />
                Exportar Excel
              </button>
            </div>

            {/* Columnas header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 110px 110px 120px',
              gap: 8, padding: '7px 16px',
              borderBottom: '0.5px solid #F4F6F8',
            }}>
              {['N° Pedido', 'Cliente', 'Total pedido', 'Costo bidones', 'Total sin bid.'].map(h => (
                <span key={h} style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Filas */}
            {bidones.map((p, i) => {
              const totalPed = p.total_manual ?? p.total_calculado
              const sinBid   = totalPed - p.costo_bidones
              const isLast   = i === bidones.length - 1
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 110px 110px 120px',
                    gap: 8, padding: '9px 16px', alignItems: 'center',
                    borderBottom: isLast ? 'none' : '0.5px solid #F4F6F8',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0D5C8A' }}>
                    P-{String(p.numero).padStart(5, '0')}
                  </span>
                  <span style={{ fontSize: 12, color: '#1A2B3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.clientes?.nombre ?? '—'}
                  </span>
                  <span style={{ fontSize: 12, color: '#1A2B3C', textAlign: 'right' }}>
                    {fmtP(totalPed)}
                  </span>
                  <span style={{ fontSize: 12, color: '#F57C00', fontWeight: 500, textAlign: 'right' }}>
                    {fmtP(p.costo_bidones)}
                  </span>
                  <span style={{ fontSize: 12, color: '#2E9E5C', textAlign: 'right' }}>
                    {fmtP(sinBid)}
                  </span>
                </div>
              )
            })}

            {/* Fila de totales */}
            <div style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 110px 110px 120px',
              gap: 8, padding: '9px 16px', alignItems: 'center',
              borderTop: '1px solid #E5E7EB', background: '#F9FAFB',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4A5568', gridColumn: '1 / 3' }}>
                Total ({bidones.length} pedido{bidones.length !== 1 ? 's' : ''})
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A2B3C', textAlign: 'right' }}>
                {fmtP(sumTotal)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#F57C00', textAlign: 'right' }}>
                {fmtP(sumBidones)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#2E9E5C', textAlign: 'right' }}>
                {fmtP(sumSinBid)}
              </span>
            </div>
          </div>
        )
      })()}

      </div>

      {/* ── Sheet pendientes de cobro (agrupado por cliente) ── */}
      <SheetClientesDeudores
        open={sheetPend}
        onClose={() => setSheetPend(false)}
      />
    </div>
  )
}
