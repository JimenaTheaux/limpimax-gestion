import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
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
  items:     ItemDetalle[]
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

// ─── Columnas explícitas para la lista ────────────────────────────────────────

const PEDIDO_LIST_SELECT = `
  id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
  total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado,
  notas_produccion, notas_internas, created_at, updated_at, cliente_id,
  clientes!inner(nombre)
` as const

// ─── Transformación snake_case → camelCase ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPedidoListItem(row: any): PedidoListItem {
  const clienteNombre =
    row.clientes?.nombre ??
    (Array.isArray(row.clientes) ? row.clientes[0]?.nombre : null) ??
    null
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
    clienteNombre,
  }
}

// ─── Query key ────────────────────────────────────────────────────────────────

const KEY = ['pedidos']

// ─── usePedidos ───────────────────────────────────────────────────────────────

export const usePedidos = (filtros?: {
  estado?:          EstadoPedido
  estados?:         EstadoPedido[]
  clienteId?:       string
  fechaProduccion?: string
  q?:               string
}) =>
  useQuery({
    queryKey:        [...KEY, filtros],
    placeholderData: keepPreviousData,   // no flash vacío al cambiar filtros
    queryFn: async () => {
      let q = supabase
        .from('pedidos')
        .select(PEDIDO_LIST_SELECT)
        .order('created_at', { ascending: false })

      if (filtros?.estado)          q = q.eq('estado', filtros.estado)
      if (filtros?.estados?.length) q = q.in('estado', filtros.estados)
      if (filtros?.clienteId)       q = q.eq('cliente_id', filtros.clienteId)
      if (filtros?.fechaProduccion) q = q.eq('fecha_produccion', filtros.fechaProduccion)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      let items = (data ?? []).map(toPedidoListItem)

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

// ─── usePedidoDetalle ─────────────────────────────────────────────────────────

export const usePedidoDetalle = (id: string | null) =>
  useQuery({
    queryKey: [...KEY, id],
    enabled:  !!id,
    queryFn: async () => {
      // Fetch pedido + items + historial en paralelo
      const [
        { data: pedido,      error: pedidoErr  },
        { data: itemsRaw,    error: itemsErr   },
        { data: historialRaw, error: histErr   },
      ] = await Promise.all([
        supabase
          .from('pedidos')
          .select(`
            id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
            total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado,
            notas_produccion, notas_internas, notas_entrega, motivo_falla,
            motivo_anulacion, created_at, updated_at, cliente_id,
            clientes!inner(nombre)
          `)
          .eq('id', id!)
          .maybeSingle(),
        supabase
          .from('pedido_items')
          .select('*, productos(nombre, fragancia, presentacion, precio_minorista, precio_mayorista)')
          .eq('pedido_id', id!),
        supabase
          .from('pedido_historial')
          .select('*, perfiles(nombre)')
          .eq('pedido_id', id!)
          .order('created_at', { ascending: true }),
      ])

      if (pedidoErr) throw new Error(pedidoErr.message)
      if (itemsErr)  throw new Error(itemsErr.message)
      if (histErr)   throw new Error(histErr.message)
      if (!pedido)   throw new Error('Pedido no encontrado')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: ItemDetalle[] = (itemsRaw ?? []).map((item: any) => ({
        id:                    item.id,
        pedidoId:              item.pedido_id,
        productoId:            item.producto_id,
        productoNombre:        item.productos?.nombre ?? '',
        productoFragancia:     item.productos?.fragancia ?? null,
        productoPresentacion:  item.productos?.presentacion != null
          ? String(item.productos.presentacion) : null,
        precioMinoristaActual: item.productos?.precio_minorista != null
          ? String(item.productos.precio_minorista) : null,
        precioMayoristaActual: item.productos?.precio_mayorista != null
          ? String(item.productos.precio_mayorista) : null,
        presentacion:          item.productos?.presentacion != null
          ? String(item.productos.presentacion) : '',
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

      return { ...toPedidoListItem(pedido), items, historial } as PedidoDetalle
    },
  })

// ─── useCrearPedido ───────────────────────────────────────────────────────────

export const useCrearPedido = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async (data: CrearPedidoInput) => {
      const estadoInicial: EstadoPedido =
        data.accion === 'confirmar' ? 'en_produccion' : 'borrador'
      const costoEnvio     = parseFloat(data.costoEnvio) || 0
      const subtotal       = data.items.reduce(
        (acc, item) => acc + parseFloat(item.cantidad) * parseFloat(item.precioUnitario),
        0
      )
      const totalCalculado = subtotal + costoEnvio

      const { data: pedido, error: pedidoErr } = await supabase
        .from('pedidos')
        .insert({
          cliente_id:        data.clienteId,
          tipo_precio:       data.tipoPrecio,
          direccion_entrega: data.direccionEntrega || null,
          fecha_produccion:  data.fechaProduccion  || null,
          notas_internas:    data.notasInternas    || null,
          notas_produccion:  data.notasProduccion  || null,
          costo_envio:       costoEnvio,
          total_calculado:   totalCalculado,
          total_manual:      data.totalManual ? parseFloat(data.totalManual) : null,
          estado:            estadoInicial,
          creado_por:        usuario?.id ?? null,
        })
        .select(`
          id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
          total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado,
          notas_produccion, notas_internas, created_at, updated_at, cliente_id,
          clientes!inner(nombre)
        `)
        .maybeSingle()

      if (pedidoErr) throw new Error(pedidoErr.message)
      if (!pedido)   throw new Error('Error al crear pedido')

      // Items + historial en paralelo (no dependen entre sí)
      await Promise.all([
        supabase.from('pedido_items').insert(
          data.items.map(item => ({
            pedido_id:         pedido.id,
            producto_id:       item.productoId,
            cantidad:          parseFloat(item.cantidad),
            precio_unitario:   parseFloat(item.precioUnitario),
            precio_referencia: parseFloat(item.precioReferencia),
            bidon_nuevo:       item.bidonNuevo,
          }))
        ),
        supabase.from('pedido_historial').insert({
          pedido_id:       pedido.id,
          estado_anterior: null,
          estado_nuevo:    estadoInicial,
          usuario_id:      usuario?.id ?? null,
          notas:           'Pedido creado',
        }),
      ])

      return toPedidoListItem(pedido)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useEditarPedido ──────────────────────────────────────────────────────────

export const useEditarPedido = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, items, ...data }: Partial<CrearPedidoInput> & { id: string }) => {
      const costoEnvio = data.costoEnvio != null ? parseFloat(data.costoEnvio) || 0 : undefined

      let totalCalculado: number | undefined
      if (items && items.length > 0 && costoEnvio !== undefined) {
        const subtotal = items.reduce(
          (acc, item) => acc + parseFloat(item.cantidad) * parseFloat(item.precioUnitario),
          0
        )
        totalCalculado = subtotal + costoEnvio
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (data.direccionEntrega !== undefined) patch.direccion_entrega = data.direccionEntrega || null
      if (data.fechaProduccion  !== undefined) patch.fecha_produccion  = data.fechaProduccion  || null
      if (data.notasInternas    !== undefined) patch.notas_internas    = data.notasInternas    || null
      if (data.notasProduccion  !== undefined) patch.notas_produccion  = data.notasProduccion  || null
      if (costoEnvio            !== undefined) patch.costo_envio       = costoEnvio
      if (data.totalManual      !== undefined) patch.total_manual      = data.totalManual ? parseFloat(data.totalManual) : null
      if (totalCalculado        !== undefined) patch.total_calculado   = totalCalculado

      const { error: updateErr } = await supabase.from('pedidos').update(patch).eq('id', id)
      if (updateErr) throw new Error(updateErr.message)

      if (items && items.length > 0) {
        const { error: delErr } = await supabase.from('pedido_items').delete().eq('pedido_id', id)
        if (delErr) throw new Error(delErr.message)

        const { error: insErr } = await supabase.from('pedido_items').insert(
          items.map(item => ({
            pedido_id:         id,
            producto_id:       item.productoId,
            cantidad:          parseFloat(item.cantidad),
            precio_unitario:   parseFloat(item.precioUnitario),
            precio_referencia: parseFloat(item.precioReferencia),
            bidon_nuevo:       item.bidonNuevo,
          }))
        )
        if (insErr) throw new Error(insErr.message)
      }

      const { data: updated, error } = await supabase
        .from('pedidos')
        .select(PEDIDO_LIST_SELECT)
        .eq('id', id)
        .maybeSingle()

      if (error)   throw new Error(error.message)
      if (!updated) throw new Error('Pedido no encontrado')
      return toPedidoListItem(updated)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

// ─── useCambiarEstado ─────────────────────────────────────────────────────────
// Usa RPC atómica: update + historial en 1 transacción, 1 HTTP request.
// Optimistic update: el estado cambia en la UI antes de confirmar con el servidor.

export const useCambiarEstado = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, estadoActual, estado, notas }: {
      id:            string
      estadoActual?: EstadoPedido
      estado:        EstadoPedido
      notas?:        string
    }) => {
      let estadoAnterior: EstadoPedido | undefined = estadoActual

      if (!estadoAnterior) {
        const { data, error } = await supabase
          .from('pedidos').select('estado').eq('id', id).maybeSingle()
        if (error) throw new Error(error.message)
        if (!data) throw new Error('Pedido no encontrado')
        estadoAnterior = data.estado as EstadoPedido
      }

      const { error } = await supabase.rpc('cambiar_estado_pedido', {
        p_pedido_id:       id,
        p_estado_nuevo:    estado,
        p_estado_anterior: estadoAnterior,
        p_usuario_id:      usuario?.id ?? null,
        p_notas:           notas ?? null,
      })

      if (error) throw new Error(error.message)
    },

    onMutate: async ({ id, estado }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const snapshots = qc.getQueriesData<PedidoListItem[]>({ queryKey: KEY })
      qc.setQueriesData<PedidoListItem[]>({ queryKey: KEY }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(p => p.id === id ? { ...p, estado } : p)
      })
      return { snapshots }
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useAnularPedido ──────────────────────────────────────────────────────────

export const useAnularPedido = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, motivo, estadoActual }: {
      id:            string
      motivo:        string
      estadoActual?: EstadoPedido
    }) => {
      let estadoAnterior: EstadoPedido | undefined = estadoActual

      if (!estadoAnterior) {
        const { data } = await supabase
          .from('pedidos').select('estado').eq('id', id).maybeSingle()
        estadoAnterior = data?.estado as EstadoPedido
      }

      const { error } = await supabase.rpc('anular_pedido', {
        p_pedido_id:       id,
        p_estado_anterior: estadoAnterior,
        p_motivo:          motivo,
        p_usuario_id:      usuario?.id ?? null,
      })

      if (error) throw new Error(error.message)
    },

    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const snapshots = qc.getQueriesData<PedidoListItem[]>({ queryKey: KEY })
      qc.setQueriesData<PedidoListItem[]>({ queryKey: KEY }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(p => p.id === id ? { ...p, estado: 'anulado' } : p)
      })
      return { snapshots }
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useRegistrarEntrega ──────────────────────────────────────────────────────
// RPC atómica: estado + cobro + historial en 1 transacción, 1 HTTP request.
// Optimistic update: el pedido desaparece de la lista del repartidor de inmediato.

export const useRegistrarEntrega = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, estadoActual, formaCobro, montoCobrado, notas }: {
      id:            string
      estadoActual:  EstadoPedido
      formaCobro:    string
      montoCobrado?: string
      notas?:        string
    }) => {
      const { error } = await supabase.rpc('registrar_entrega', {
        p_pedido_id:       id,
        p_estado_anterior: estadoActual,
        p_forma_cobro:     formaCobro,
        p_monto_cobrado:   montoCobrado ? parseFloat(montoCobrado) : null,
        p_notas_entrega:   notas ?? null,
        p_usuario_id:      usuario?.id ?? null,
      })

      if (error) throw new Error(error.message)
    },

    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const snapshots = qc.getQueriesData<PedidoListItem[]>({ queryKey: KEY })
      qc.setQueriesData<PedidoListItem[]>({ queryKey: KEY }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(p => p.id === id ? { ...p, estado: 'entregado' } : p)
      })
      return { snapshots }
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useEditarCobro ───────────────────────────────────────────────────────────

export const useEditarCobro = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, formaCobro, montoCobrado }: {
      id: string; formaCobro: string; montoCobrado?: string
    }) => {
      const { error } = await supabase
        .from('pedidos')
        .update({
          forma_cobro:   formaCobro,
          monto_cobrado: montoCobrado ? parseFloat(montoCobrado) : null,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export const totalPedido = (p: Pick<PedidoListItem, 'totalManual' | 'totalCalculado'>) =>
  p.totalManual ?? p.totalCalculado
