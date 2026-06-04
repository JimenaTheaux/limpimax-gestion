import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EstadoPedido } from '@/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PedidoListItem {
  id:               string
  numero:           number
  estado:           EstadoPedido
  tipoPrecio:       'minorista' | 'mayorista'
  direccionEntrega: string | null
  fechaProduccion:  string | null
  totalCalculado:   string
  totalManual:      string | null
  costoEnvio:       string
  formaCobro:       'efectivo' | 'transferencia' | 'pendiente' | null
  montoCobrado:     string | null
  notasProduccion:  string | null
  notasInternas:    string | null
  createdAt:        string
  updatedAt:        string
  clienteId:        string
  clienteNombre:    string | null
}

export interface ItemForm {
  productoId:       string
  productoNombre:   string
  presentacion:     string
  cantidad:         string
  precioUnitario:   string
  precioReferencia: string
  bidonNuevo:       boolean
}

export interface PedidoDetalle extends PedidoListItem {
  items:    ItemDetalle[]
  historial: HistorialItem[]
}

export interface ItemDetalle extends ItemForm {
  id:                    string
  pedidoId:              string
  productoFragancia:     string | null
  productoPresentacion:  string | null
  precioMinoristaActual: string | null
  precioMayoristaActual: string | null
}

export interface HistorialItem {
  id:             string
  estadoAnterior: EstadoPedido | null
  estadoNuevo:    EstadoPedido
  notas:          string | null
  createdAt:      string
  usuarioNombre:  string | null
}

export interface CrearPedidoInput {
  clienteId:        string
  tipoPrecio:       'minorista' | 'mayorista'
  direccionEntrega: string
  fechaProduccion:  string
  notasInternas:    string
  notasProduccion:  string
  costoEnvio:       string
  totalManual:      string
  items:            ItemForm[]
  accion:           'borrador' | 'confirmar'
}

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEY = ['pedidos']

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const usePedidos = (filtros?: {
  estado?:          EstadoPedido
  clienteId?:       string
  fechaProduccion?: string
  q?:               string
}) =>
  useQuery({
    queryKey: [...KEY, filtros],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filtros?.estado)          params.set('estado', filtros.estado)
      if (filtros?.clienteId)       params.set('clienteId', filtros.clienteId)
      if (filtros?.fechaProduccion) params.set('fechaProduccion', filtros.fechaProduccion)
      if (filtros?.q)               params.set('q', filtros.q)
      const qs = params.toString()
      return api.get<PedidoListItem[]>(`/api/pedidos${qs ? `?${qs}` : ''}`)
    },
    refetchInterval: 30_000,
  })

export const usePedidoDetalle = (id: string | null) =>
  useQuery({
    queryKey:  [...KEY, id],
    queryFn:   () => api.get<PedidoDetalle>(`/api/pedidos/${id}`),
    enabled:   !!id,
  })

export const useCrearPedido = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CrearPedidoInput) => api.post<PedidoListItem>('/api/pedidos', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarPedido = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CrearPedidoInput> & { id: string }) =>
      api.patch<PedidoListItem>(`/api/pedidos/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useCambiarEstado = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado, notas }: { id: string; estado: EstadoPedido; notas?: string }) =>
      api.patch<PedidoListItem>(`/api/pedidos/${id}/estado`, { estado, notas }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useAnularPedido = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api.post<PedidoListItem>(`/api/pedidos/${id}/anular`, { motivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarCobro = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formaCobro, montoCobrado }: { id: string; formaCobro: string; montoCobrado?: string }) =>
      api.patch<PedidoListItem>(`/api/pedidos/${id}/cobro`, { formaCobro, montoCobrado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// Helper
export const totalPedido = (p: Pick<PedidoListItem, 'totalManual' | 'totalCalculado'>) =>
  p.totalManual ?? p.totalCalculado
