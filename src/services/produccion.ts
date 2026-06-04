import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EstadoPedido } from '@/types'

export interface ItemProduccion {
  pedidoId:     string
  productoId:   string
  cantidad:     string
  bidonNuevo:   boolean
  nombre:       string | null
  fragancia:    string | null
  presentacion: string | null
}

export interface PedidoProduccion {
  id:               string
  numero:           number
  estado:           EstadoPedido
  fechaProduccion:  string | null
  notasProduccion:  string | null
  direccionEntrega: string | null
  createdAt:        string
  updatedAt:        string
  clienteId:        string
  clienteNombre:    string | null
  items:            ItemProduccion[]
}

export interface PedidoListoHoy {
  id:              string
  numero:          number
  estado:          EstadoPedido
  fechaProduccion: string | null
  notasProduccion: string | null
  updatedAt:       string
  clienteNombre:   string | null
}

export interface ResumenProduccion {
  productoId:      string
  nombreProducto:  string | null
  presentacion:    string | null
  unidadMedida:    string | null
  fechaProduccion: string | null
  totalCantidad:   number
  totalBidonNuevo: number
}

export interface DashboardData {
  hoy: {
    total:               number
    porEstado:           Record<string, number>
    totalEfectivo:       number
    totalTransferencia:  number
    totalCobrado:        number
    cobrandoPendientes:  number
  }
  activos: {
    total:     number
    porEstado: Record<string, number>
  }
  pedidosHoy: {
    id: string; numero: number; estado: EstadoPedido
    totalCalculado: string; totalManual: string | null
    formaCobro: string | null; montoCobrado: string | null
    fechaProduccion: string | null; clienteId: string
  }[]
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const usePedidosProduccion = (fecha?: string) =>
  useQuery({
    queryKey: ['produccion', fecha],
    queryFn:  () => api.get<PedidoProduccion[]>(
      `/api/produccion${fecha ? `?fecha=${fecha}` : ''}`
    ),
    refetchInterval: 30_000,
  })

export const usePedidosListosHoy = () =>
  useQuery({
    queryKey: ['produccion', 'listos'],
    queryFn:  () => api.get<PedidoListoHoy[]>('/api/produccion/listos'),
    refetchInterval: 30_000,
  })

export const useResumenProduccion = (fecha?: string) =>
  useQuery({
    queryKey: ['produccion', 'resumen', fecha],
    queryFn:  () => api.get<ResumenProduccion[]>(
      `/api/produccion/resumen${fecha ? `?fecha=${fecha}` : ''}`
    ),
  })

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => api.get<DashboardData>('/api/dashboard'),
    refetchInterval: 60_000,
  })
