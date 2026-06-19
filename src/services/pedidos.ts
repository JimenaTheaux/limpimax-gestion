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

// ─── Select explícito para lista — sin columnas internas no necesarias ────────

const PEDIDO_LIST_SELECT = `
  id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
  total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado,
  notas_produccion, notas_internas, created_at, updated_at, cliente_id,
  clientes!inner(nombre)
` as const

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
    // Supabase devuelve el join como objeto o array dependiendo del hint usado
    clienteNombre:    row.clientes?.nombre ?? (Array.isArray(row.clientes) ? row.clientes[0]?.nombre : null) ?? null,
  }
}

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEY = ['pedidos']

// ─── usePedidos ───────────────────────────────────────────────────────────────

export const usePedidos = (filtros?: {
  estado?:          EstadoPedido
  estados?:         EstadoPedido[]   // filtro por múltiples estados (server-side)
  clienteId?:       string
  fechaProduccion?: string
  q?:               string
}) =>
  useQuery({
    queryKey: [...KEY, filtros],
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
      // Fetch pedido + items + historial en paralelo (items/historial no dependen entre sí)
      const [{ data: pedido, error: pedidoErr }, { data: itemsRaw, error: itemsErr }, { data: historialRaw, error: histErr }] =
        await Promise.all([
          supabase
            .from('pedidos')
            .select(`
              id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
              total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado,
              notas_produccion, notas_internas, notas_entrega, motivo_falla, motivo_anulacion,
              created_at, updated_at, cliente_id,
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

      return { ...toPedidoListItem(pedido), items, historial } as PedidoDetalle
    },
  })

// ─── useCrearPedido ───────────────────────────────────────────────────────────
// FIX: 'confirmar' → estado 'en_produccion' (no 'confirmado') per spec
// FIX: items + historial en paralelo (ahorra ~200ms)

export const useCrearPedido = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async (data: CrearPedidoInput) => {
      // 'confirmar' va directo a en_produccion per docs: "Confirmar pedido → EN PRODUCCIÓN automáticamente"
      const estadoInicial: EstadoPedido = data.accion === 'confirmar' ? 'en_produccion' : 'borrador'
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

      // 2+3. Items e historial en paralelo
      const itemsPayload = data.items.map(item => ({
        pedido_id:         pedido.id,
        producto_id:       item.productoId,
        cantidad:          parseFloat(item.cantidad),
        precio_unitario:   parseFloat(item.precioUnitario),
        precio_referencia: parseFloat(item.precioReferencia),
        bidon_nuevo:       item.bidonNuevo,
      }))

      const [itemsResult] = await Promise.all([
        supabase.from('pedido_items').insert(itemsPayload),
        supabase.from('pedido_historial').insert({
          pedido_id:       pedido.id,
          estado_anterior: null,
          estado_nuevo:    estadoInicial,
          usuario_id:      usuario?.id ?? null,
          notas:           'Pedido creado',
        }),
      ])

      if (itemsResult.error) throw new Error(itemsResult.error.message)

      return toPedidoListItem(pedido)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useEditarPedido ──────────────────────────────────────────────────────────
// FIX: actualiza items (delete-and-reinsert) y recalcula total_calculado

export const useEditarPedido = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, items, ...data }: Partial<CrearPedidoInput> & { id: string }) => {
      const costoEnvio = data.costoEnvio != null ? parseFloat(data.costoEnvio) || 0 : undefined

      // Calcular nuevo total si hay items nuevos
      let totalCalculado: number | undefined
      if (items && items.length > 0 && costoEnvio !== undefined) {
        const subtotal = items.reduce(
          (acc, item) => acc + parseFloat(item.cantidad) * parseFloat(item.precioUnitario),
          0
        )
        totalCalculado = subtotal + costoEnvio
      }

      const patch: Record<string, unknown> = {}
      if (data.direccionEntrega !== undefined) patch.direccion_entrega = data.direccionEntrega || null
      if (data.fechaProduccion  !== undefined) patch.fecha_produccion  = data.fechaProduccion  || null
      if (data.notasInternas    !== undefined) patch.notas_internas    = data.notasInternas    || null
      if (data.notasProduccion  !== undefined) patch.notas_produccion  = data.notasProduccion  || null
      if (costoEnvio            !== undefined) patch.costo_envio       = costoEnvio
      if (data.totalManual      !== undefined) patch.total_manual      = data.totalManual ? parseFloat(data.totalManual) : null
      if (totalCalculado        !== undefined) patch.total_calculado   = totalCalculado

      // 1. Update pedido header
      const { error: updateErr } = await supabase.from('pedidos').update(patch).eq('id', id)
      if (updateErr) throw new Error(updateErr.message)

      // 2. Replace items si se proporcionaron (delete-then-insert, secuencial por dependencia)
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

      // Fetch el pedido actualizado para devolver
      const { data: updated, error } = await supabase
        .from('pedidos')
        .select(PEDIDO_LIST_SELECT)
        .eq('id', id)
        .maybeSingle()

      if (error)   throw new Error(error.message)
      if (!updated) throw new Error('Pedido no encontrado')
      return toPedidoListItem(updated)
    },
    onSuccess: (_data, { id }) => {
      // Invalidar lista + detalle
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

// ─── useCambiarEstado ─────────────────────────────────────────────────────────
// OPT: acepta `estadoActual` para evitar la query de lectura previa
//      Si no se pasa, hace la lectura (backward compat)

export const useCambiarEstado = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, estadoActual, estado, notas }: {
      id:            string
      estadoActual?: EstadoPedido  // si se pasa, evita la lectura previa
      estado:        EstadoPedido
      notas?:        string
    }) => {
      let estadoAnterior: EstadoPedido

      if (estadoActual) {
        // Path óptimo: el caller sabe el estado actual → 0 lecturas extra
        estadoAnterior = estadoActual
      } else {
        // Fallback: leer estado actual (solo si el caller no lo sabe)
        const { data: actual, error: readErr } = await supabase
          .from('pedidos')
          .select('estado')
          .eq('id', id)
          .maybeSingle()

        if (readErr) throw new Error(readErr.message)
        if (!actual) throw new Error('Pedido no encontrado')
        estadoAnterior = actual.estado as EstadoPedido
      }

      // Update estado + insert historial en paralelo
      const [{ error: updateErr }] = await Promise.all([
        supabase.from('pedidos').update({ estado }).eq('id', id),
        supabase.from('pedido_historial').insert({
          pedido_id:       id,
          estado_anterior: estadoAnterior,
          estado_nuevo:    estado,
          usuario_id:      usuario?.id ?? null,
          notas:           notas ?? null,
        }),
      ])

      if (updateErr) throw new Error(updateErr.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useAnularPedido ──────────────────────────────────────────────────────────

export const useAnularPedido = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, motivo, estadoActual }: {
      id:           string
      motivo:       string
      estadoActual?: EstadoPedido
    }) => {
      let estadoAnterior: EstadoPedido

      if (estadoActual) {
        if (estadoActual === 'cerrado') throw new Error('No se puede anular un pedido cerrado.')
        if (estadoActual === 'anulado') throw new Error('El pedido ya está anulado.')
        estadoAnterior = estadoActual
      } else {
        const { data: actual } = await supabase
          .from('pedidos').select('estado').eq('id', id).maybeSingle()
        if (actual?.estado === 'cerrado') throw new Error('No se puede anular un pedido cerrado.')
        if (actual?.estado === 'anulado') throw new Error('El pedido ya está anulado.')
        estadoAnterior = actual?.estado as EstadoPedido
      }

      const [{ error }] = await Promise.all([
        supabase.from('pedidos').update({ estado: 'anulado', motivo_anulacion: motivo }).eq('id', id),
        supabase.from('pedido_historial').insert({
          pedido_id:       id,
          estado_anterior: estadoAnterior,
          estado_nuevo:    'anulado',
          usuario_id:      usuario?.id ?? null,
          notas:           motivo,
        }),
      ])

      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useRegistrarEntrega ──────────────────────────────────────────────────────
// NUEVO: combina cambio de estado a 'entregado' + cobro en 1 update + 1 insert
// antes: cambiarEstado (3 queries) + editarCobro (1 query) = 4 queries
// ahora: 1 update + 1 historial = 2 queries

export const useRegistrarEntrega = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, estadoActual, formaCobro, montoCobrado, notas }: {
      id:           string
      estadoActual: EstadoPedido
      formaCobro:   string
      montoCobrado?: string
      notas?:        string
    }) => {
      const [{ error }] = await Promise.all([
        supabase.from('pedidos').update({
          estado:        'entregado',
          forma_cobro:   formaCobro,
          monto_cobrado: montoCobrado ? parseFloat(montoCobrado) : null,
          notas_entrega: notas ?? null,
        }).eq('id', id),
        supabase.from('pedido_historial').insert({
          pedido_id:       id,
          estado_anterior: estadoActual,
          estado_nuevo:    'entregado',
          usuario_id:      usuario?.id ?? null,
          notas:           notas ?? null,
        }),
      ])

      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
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
