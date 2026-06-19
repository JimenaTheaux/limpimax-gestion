import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { EstadoPedido } from '@/types'

// ─── Tipos (mantienen camelCase de la interfaz original) ──────────────────────

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

export interface PedidoDetalle extends PedidoListItem {
  items:    ItemDetalle[]
  historial: HistorialItem[]
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

// ─── Helpers de transformación (snake_case DB → camelCase UI) ────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPedidoListItem(row: any): PedidoListItem {
  return {
    id:               row.id,
    numero:           row.numero,
    estado:           row.estado,
    tipoPrecio:       row.tipo_precio,
    direccionEntrega: row.direccion_entrega,
    fechaProduccion:  row.fecha_produccion,
    totalCalculado:   String(row.total_calculado ?? '0'),
    totalManual:      row.total_manual != null ? String(row.total_manual) : null,
    costoEnvio:       String(row.costo_envio ?? '0'),
    formaCobro:       row.forma_cobro,
    montoCobrado:     row.monto_cobrado != null ? String(row.monto_cobrado) : null,
    notasProduccion:  row.notas_produccion,
    notasInternas:    row.notas_internas,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
    clienteId:        row.cliente_id,
    clienteNombre:    row.clientes?.nombre ?? null,
  }
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
    queryFn: async () => {
      let q = supabase
        .from('pedidos')
        .select('*, clientes(nombre)')
        .order('created_at', { ascending: false })

      if (filtros?.estado)          q = q.eq('estado', filtros.estado)
      if (filtros?.clienteId)       q = q.eq('cliente_id', filtros.clienteId)
      if (filtros?.fechaProduccion) q = q.eq('fecha_produccion', filtros.fechaProduccion)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      let items = (data ?? []).map(toPedidoListItem)

      // Filtro de texto libre (número o nombre de cliente)
      if (filtros?.q) {
        const lower = filtros.q.toLowerCase()
        items = items.filter(p =>
          String(p.numero).includes(filtros.q!) ||
          (p.clienteNombre ?? '').toLowerCase().includes(lower)
        )
      }

      return items
    },
    refetchInterval: 30_000,
  })

export const usePedidoDetalle = (id: string | null) =>
  useQuery({
    queryKey:  [...KEY, id],
    enabled:   !!id,
    queryFn:  async () => {
      // Pedido base
      const { data: pedido, error: pedidoErr } = await supabase
        .from('pedidos')
        .select('*, clientes(nombre)')
        .eq('id', id!)
        .maybeSingle()

      if (pedidoErr) throw new Error(pedidoErr.message)
      if (!pedido)   throw new Error('Pedido no encontrado')

      // Items con producto
      const { data: itemsRaw, error: itemsErr } = await supabase
        .from('pedido_items')
        .select('*, productos(nombre, fragancia, presentacion, precio_minorista, precio_mayorista)')
        .eq('pedido_id', id!)

      if (itemsErr) throw new Error(itemsErr.message)

      // Historial con perfil
      const { data: historialRaw, error: histErr } = await supabase
        .from('pedido_historial')
        .select('*, perfiles(nombre)')
        .eq('pedido_id', id!)
        .order('created_at', { ascending: true })

      if (histErr) throw new Error(histErr.message)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: ItemDetalle[] = (itemsRaw ?? []).map((item: any) => ({
        id:                    item.id,
        pedidoId:              item.pedido_id,
        productoId:            item.producto_id,
        productoNombre:        item.productos?.nombre ?? '',
        productoFragancia:     item.productos?.fragancia ?? null,
        productoPresentacion:  item.productos?.presentacion != null ? String(item.productos.presentacion) : null,
        precioMinoristaActual: item.productos?.precio_minorista != null ? String(item.productos.precio_minorista) : null,
        precioMayoristaActual: item.productos?.precio_mayorista != null ? String(item.productos.precio_mayorista) : null,
        presentacion:          item.productos?.presentacion != null ? String(item.productos.presentacion) : '',
        cantidad:              String(item.cantidad),
        precioUnitario:        String(item.precio_unitario),
        precioReferencia:      String(item.precio_referencia),
        bidonNuevo:            item.bidon_nuevo ?? false,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const historial: HistorialItem[] = (historialRaw ?? []).map((h: any) => ({
        id:             h.id,
        estadoAnterior: h.estado_anterior,
        estadoNuevo:    h.estado_nuevo,
        notas:          h.notas,
        createdAt:      h.created_at,
        usuarioNombre:  h.perfiles?.nombre ?? null,
      }))

      return {
        ...toPedidoListItem(pedido),
        items,
        historial,
      } as PedidoDetalle
    },
  })

export const useCrearPedido = () => {
  const qc = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async (data: CrearPedidoInput) => {
      const estadoInicial = data.accion === 'confirmar' ? 'confirmado' : 'borrador'
      const costoEnvio    = parseFloat(data.costoEnvio) || 0
      const subtotal      = data.items.reduce(
        (acc, item) => acc + parseFloat(item.cantidad) * parseFloat(item.precioUnitario),
        0
      )
      const totalCalculado = subtotal + costoEnvio

      // 1. Insertar pedido
      const { data: pedido, error: pedidoErr } = await supabase
        .from('pedidos')
        .insert({
          cliente_id:        data.clienteId,
          tipo_precio:       data.tipoPrecio,
          direccion_entrega: data.direccionEntrega || null,
          fecha_produccion:  data.fechaProduccion || null,
          notas_internas:    data.notasInternas   || null,
          notas_produccion:  data.notasProduccion || null,
          costo_envio:       costoEnvio,
          total_calculado:   totalCalculado,
          total_manual:      data.totalManual ? parseFloat(data.totalManual) : null,
          estado:            estadoInicial,
          creado_por:        usuario?.id ?? null,
        })
        .select('*, clientes(nombre)')
        .maybeSingle()

      if (pedidoErr) throw new Error(pedidoErr.message)
      if (!pedido)   throw new Error('Error al crear pedido')

      // 2. Insertar items
      if (data.items.length > 0) {
        const { error: itemsErr } = await supabase.from('pedido_items').insert(
          data.items.map(item => ({
            pedido_id:         pedido.id,
            producto_id:       item.productoId,
            cantidad:          parseFloat(item.cantidad),
            precio_unitario:   parseFloat(item.precioUnitario),
            precio_referencia: parseFloat(item.precioReferencia),
            bidon_nuevo:       item.bidonNuevo,
          }))
        )
        if (itemsErr) throw new Error(itemsErr.message)
      }

      // 3. Historial
      await supabase.from('pedido_historial').insert({
        pedido_id:       pedido.id,
        estado_anterior: null,
        estado_nuevo:    estadoInicial,
        usuario_id:      usuario?.id ?? null,
        notas:           'Pedido creado',
      })

      return toPedidoListItem(pedido)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarPedido = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CrearPedidoInput> & { id: string }) => {
      const patch: Record<string, unknown> = {}
      if (data.direccionEntrega !== undefined) patch.direccion_entrega = data.direccionEntrega || null
      if (data.fechaProduccion  !== undefined) patch.fecha_produccion  = data.fechaProduccion  || null
      if (data.notasInternas    !== undefined) patch.notas_internas    = data.notasInternas    || null
      if (data.notasProduccion  !== undefined) patch.notas_produccion  = data.notasProduccion  || null
      if (data.costoEnvio       !== undefined) patch.costo_envio       = parseFloat(data.costoEnvio) || 0
      if (data.totalManual      !== undefined) patch.total_manual      = data.totalManual ? parseFloat(data.totalManual) : null

      const { data: updated, error } = await supabase
        .from('pedidos')
        .update(patch)
        .eq('id', id)
        .select('*, clientes(nombre)')
        .maybeSingle()

      if (error)   throw new Error(error.message)
      if (!updated) throw new Error('Pedido no encontrado')
      return toPedidoListItem(updated)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useCambiarEstado = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, estado, notas }: { id: string; estado: EstadoPedido; notas?: string }) => {
      const { data: actual, error: readErr } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', id)
        .maybeSingle()

      if (readErr) throw new Error(readErr.message)
      if (!actual) throw new Error('Pedido no encontrado')

      const { data: updated, error: updateErr } = await supabase
        .from('pedidos')
        .update({ estado })
        .eq('id', id)
        .select('*, clientes(nombre)')
        .maybeSingle()

      if (updateErr) throw new Error(updateErr.message)

      await supabase.from('pedido_historial').insert({
        pedido_id:       id,
        estado_anterior: actual.estado,
        estado_nuevo:    estado,
        usuario_id:      usuario?.id ?? null,
        notas:           notas ?? null,
      })

      return toPedidoListItem(updated!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useAnularPedido = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data: actual } = await supabase
        .from('pedidos').select('estado').eq('id', id).maybeSingle()

      if (actual?.estado === 'cerrado') throw new Error('No se puede anular un pedido cerrado.')
      if (actual?.estado === 'anulado') throw new Error('El pedido ya está anulado.')

      const { data: updated, error } = await supabase
        .from('pedidos')
        .update({ estado: 'anulado', motivo_anulacion: motivo })
        .eq('id', id)
        .select('*, clientes(nombre)')
        .maybeSingle()

      if (error) throw new Error(error.message)

      await supabase.from('pedido_historial').insert({
        pedido_id:       id,
        estado_anterior: actual?.estado ?? null,
        estado_nuevo:    'anulado',
        usuario_id:      usuario?.id ?? null,
        notas:           motivo,
      })

      return toPedidoListItem(updated!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarCobro = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, formaCobro, montoCobrado }: {
      id: string; formaCobro: string; montoCobrado?: string
    }) => {
      const { data: updated, error } = await supabase
        .from('pedidos')
        .update({
          forma_cobro:  formaCobro,
          monto_cobrado: montoCobrado ? parseFloat(montoCobrado) : null,
        })
        .eq('id', id)
        .select('*, clientes(nombre)')
        .maybeSingle()

      if (error) throw new Error(error.message)
      return toPedidoListItem(updated!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// Helper
export const totalPedido = (p: Pick<PedidoListItem, 'totalManual' | 'totalCalculado'>) =>
  p.totalManual ?? p.totalCalculado
