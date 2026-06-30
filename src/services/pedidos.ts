import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { totalPedido } from '@/types'
import type { Pedido, PedidoItem, PedidoHistorial, PedidoPago, Cliente, Producto, EstadoPedido } from '@/types'

export { totalPedido }

// ─── Tipos extendidos (con joins de Supabase) ────────────────────────────────

export type PedidoConCliente = Pedido & {
  clientes: Pick<Cliente, 'nombre' | 'direccion' | 'tipo_cliente' | 'telefono'>
}

export type ItemDetalle = PedidoItem & {
  productos: Pick<Producto, 'nombre' | 'fragancia' | 'presentacion' | 'precio_minorista' | 'precio_mayorista'>
}

export type HistorialDetalle = PedidoHistorial & {
  perfiles: { nombre: string } | null
}

export type PedidoDetalle = PedidoConCliente & {
  pedido_items:     ItemDetalle[]
  pedido_historial: HistorialDetalle[]
  pedido_pagos:     PedidoPago[]
}

export type PedidoListItem = PedidoConCliente

// ─── Tipo para filas de pago en el form de cierre ────────────────────────────

export interface PagoInput {
  forma_pago: 'efectivo' | 'transferencia'
  monto:      string
}

// ─── Tipo para ítems del formulario (strings para inputs numéricos) ───────────

export interface ItemForm {
  producto_id:       string
  producto_nombre:   string
  presentacion:      string
  cantidad:          string
  precio_unitario:   string
  precio_referencia: string
  bidon_nuevo:       boolean
}

// ─── Tipo de entrada para crear/editar pedido ─────────────────────────────────

export interface CrearPedidoInput {
  cliente_id:               string
  tipo_precio:              'minorista' | 'mayorista'
  direccion_entrega:        string
  fecha_produccion:         string
  notas_internas:           string
  notas_produccion:         string
  costo_envio:              string
  total_manual:             string
  saldo_anterior_aplicado?: string
  items:                    ItemForm[]
  accion:                   'borrador' | 'confirmar'
}

// ─── Helper: costo de producción por producto ─────────────────────────────────

async function fetchCostoMap(productoIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(productoIds)]
  const { data } = await supabase
    .from('productos')
    .select('id, costo_produccion')
    .in('id', ids)
  return Object.fromEntries((data ?? []).map(p => [p.id, Number(p.costo_produccion ?? 0)]))
}

// ─── Parseo de numéricos ──────────────────────────────────────────────────────
// Supabase retorna NUMERIC/DECIMAL como string — convertimos a number

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePedido(row: any): PedidoConCliente {
  return {
    ...row,
    costo_envio:             Number(row.costo_envio     ?? 0),
    total_calculado:         Number(row.total_calculado ?? 0),
    total_manual:            row.total_manual            != null ? Number(row.total_manual)            : null,
    monto_cobrado:           row.monto_cobrado           != null ? Number(row.monto_cobrado)           : null,
    saldo_anterior_aplicado: row.saldo_anterior_aplicado != null ? Number(row.saldo_anterior_aplicado) : null,
  } as PedidoConCliente
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseItemDetalle(item: any): ItemDetalle {
  return {
    ...item,
    cantidad:          Number(item.cantidad),
    precio_unitario:   Number(item.precio_unitario),
    precio_referencia: Number(item.precio_referencia),
    bidon_nuevo:       item.bidon_nuevo ?? false,
    productos: item.productos
      ? {
          nombre:           item.productos.nombre,
          fragancia:        item.productos.fragancia   ?? null,
          presentacion:     Number(item.productos.presentacion),
          precio_minorista: Number(item.productos.precio_minorista),
          precio_mayorista: Number(item.productos.precio_mayorista),
        }
      : null,
  } as ItemDetalle
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePedidoPago(row: any): PedidoPago {
  return { ...row, monto: Number(row.monto) }
}

// ─── Select para listas ───────────────────────────────────────────────────────

const LIST_SELECT = `
  id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
  total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado,
  fecha_cobro, estado_pago, motivo_falla, saldo_anterior_aplicado,
  notas_produccion, notas_internas, created_at, updated_at, cliente_id,
  clientes!inner(nombre, direccion, tipo_cliente, telefono)
` as const

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
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from('pedidos')
        .select(LIST_SELECT)
        .order('created_at', { ascending: false })

      if (filtros?.estado)          q = q.eq('estado', filtros.estado)
      if (filtros?.estados?.length) q = q.in('estado', filtros.estados)
      if (filtros?.clienteId)       q = q.eq('cliente_id', filtros.clienteId)
      if (filtros?.fechaProduccion) q = q.eq('fecha_produccion', filtros.fechaProduccion)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      let pedidos = (data ?? []).map(parsePedido)

      if (filtros?.q) {
        const lower = filtros.q.toLowerCase()
        pedidos = pedidos.filter(p =>
          String(p.numero).includes(filtros.q!) ||
          (p.clientes?.nombre ?? '').toLowerCase().includes(lower) ||
          (p.clientes?.direccion ?? '').toLowerCase().includes(lower)
        )
      }
      return pedidos
    },
    refetchInterval: 30_000,
  })

// ─── usePedidoDetalle ─────────────────────────────────────────────────────────

export const usePedidoDetalle = (id: string | null) =>
  useQuery({
    queryKey: [...KEY, id],
    enabled:  !!id,
    queryFn: async () => {
      const [
        { data: pedido,       error: e1 },
        { data: itemsRaw,     error: e2 },
        { data: historialRaw, error: e3 },
        { data: pagosRaw,     error: e4 },
      ] = await Promise.all([
        supabase
          .from('pedidos')
          .select(`
            id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
            total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado, fecha_cobro,
            estado_pago, notas_produccion, notas_internas, notas_entrega, motivo_falla,
            motivo_anulacion, created_at, updated_at, cliente_id,
            clientes!inner(nombre, direccion, tipo_cliente, telefono)
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
        supabase
          .from('pedido_pagos')
          .select('*')
          .eq('pedido_id', id!)
          .order('created_at', { ascending: true }),
      ])

      if (e1) throw new Error(e1.message)
      if (e2) throw new Error(e2.message)
      if (e3) throw new Error(e3.message)
      if (e4) throw new Error(e4.message)
      if (!pedido) throw new Error('Pedido no encontrado')

      return {
        ...parsePedido(pedido),
        pedido_items:     (itemsRaw    ?? []).map(parseItemDetalle),
        pedido_historial: (historialRaw ?? []) as HistorialDetalle[],
        pedido_pagos:     (pagosRaw    ?? []).map(parsePedidoPago),
      } as PedidoDetalle
    },
  })

// ─── fetchPedidoDetalle — imperativo para uso fuera de hooks ─────────────────

export async function fetchPedidoDetalle(id: string): Promise<PedidoDetalle> {
  const [
    { data: pedido,       error: e1 },
    { data: itemsRaw,     error: e2 },
    { data: historialRaw, error: e3 },
    { data: pagosRaw,     error: e4 },
  ] = await Promise.all([
    supabase
      .from('pedidos')
      .select(`
        id, numero, estado, tipo_precio, direccion_entrega, fecha_produccion,
        total_calculado, total_manual, costo_envio, forma_cobro, monto_cobrado, fecha_cobro,
        notas_produccion, notas_internas, notas_entrega, motivo_falla,
        motivo_anulacion, created_at, updated_at, cliente_id, estado_pago,
        clientes!inner(nombre, direccion, tipo_cliente, telefono)
      `)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('pedido_items')
      .select('*, productos(nombre, fragancia, presentacion, precio_minorista, precio_mayorista)')
      .eq('pedido_id', id),
    supabase
      .from('pedido_historial')
      .select('*, perfiles(nombre)')
      .eq('pedido_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('pedido_pagos')
      .select('*')
      .eq('pedido_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (e1) throw new Error(e1.message)
  if (e2) throw new Error(e2.message)
  if (e3) throw new Error(e3.message)
  if (e4) throw new Error(e4.message)
  if (!pedido) throw new Error('Pedido no encontrado')

  return {
    ...parsePedido(pedido),
    pedido_items:     (itemsRaw    ?? []).map(parseItemDetalle),
    pedido_historial: (historialRaw ?? []) as HistorialDetalle[],
    pedido_pagos:     (pagosRaw    ?? []).map(parsePedidoPago),
  } as PedidoDetalle
}

// ─── useCrearPedido ───────────────────────────────────────────────────────────

export const useCrearPedido = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async (data: CrearPedidoInput) => {
      const estadoInicial: EstadoPedido =
        data.accion === 'confirmar' ? 'en_produccion' : 'borrador'
      const costoEnvio    = parseFloat(data.costo_envio) || 0
      const saldoAplicado = data.saldo_anterior_aplicado ? parseFloat(data.saldo_anterior_aplicado) : 0
      const subtotal      = data.items.reduce(
        (acc, item) => acc + parseFloat(item.cantidad) * parseFloat(item.precio_unitario),
        0
      )
      const totalCalculado = subtotal + costoEnvio + saldoAplicado

      const { data: pedido, error: e1 } = await supabase
        .from('pedidos')
        .insert({
          cliente_id:               data.cliente_id,
          tipo_precio:              data.tipo_precio,
          direccion_entrega:        data.direccion_entrega || null,
          fecha_produccion:         data.fecha_produccion  || null,
          notas_internas:           data.notas_internas    || null,
          notas_produccion:         data.notas_produccion  || null,
          costo_envio:              costoEnvio,
          total_calculado:          totalCalculado,
          total_manual:             data.total_manual ? parseFloat(data.total_manual) : null,
          saldo_anterior_aplicado:  saldoAplicado,
          estado:                   estadoInicial,
          creado_por:               usuario?.id ?? null,
        })
        .select(LIST_SELECT)
        .single()

      if (e1) throw new Error(e1.message)

      const costoMap = await fetchCostoMap(data.items.map(i => i.producto_id))

      await Promise.all([
        supabase.from('pedido_items').insert(
          data.items.map(item => ({
            pedido_id:         pedido.id,
            producto_id:       item.producto_id,
            cantidad:          parseFloat(item.cantidad),
            precio_unitario:   parseFloat(item.precio_unitario),
            precio_referencia: parseFloat(item.precio_referencia),
            bidon_nuevo:       item.bidon_nuevo,
            costo_snapshot:    costoMap[item.producto_id] ?? 0,
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

      return parsePedido(pedido)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useEditarPedido ──────────────────────────────────────────────────────────

export const useEditarPedido = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, items, ...data }: Partial<CrearPedidoInput> & { id: string }) => {
      const costoEnvio = data.costo_envio != null ? parseFloat(data.costo_envio) || 0 : undefined

      let totalCalculado: number | undefined
      if (items && items.length > 0 && costoEnvio !== undefined) {
        const subtotal = items.reduce(
          (acc, item) => acc + parseFloat(item.cantidad) * parseFloat(item.precio_unitario),
          0
        )
        totalCalculado = subtotal + costoEnvio
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (data.direccion_entrega !== undefined) patch.direccion_entrega = data.direccion_entrega || null
      if (data.fecha_produccion  !== undefined) patch.fecha_produccion  = data.fecha_produccion  || null
      if (data.notas_internas    !== undefined) patch.notas_internas    = data.notas_internas    || null
      if (data.notas_produccion  !== undefined) patch.notas_produccion  = data.notas_produccion  || null
      if (costoEnvio             !== undefined) patch.costo_envio       = costoEnvio
      if (data.total_manual      !== undefined) patch.total_manual      = data.total_manual ? parseFloat(data.total_manual) : null
      if (totalCalculado         !== undefined) patch.total_calculado   = totalCalculado

      const { error: updateErr } = await supabase.from('pedidos').update(patch).eq('id', id)
      if (updateErr) throw new Error(updateErr.message)

      if (items && items.length > 0) {
        const costoMap = await fetchCostoMap(items.map(i => i.producto_id))

        const { error: delErr } = await supabase.from('pedido_items').delete().eq('pedido_id', id)
        if (delErr) throw new Error(delErr.message)

        const { error: insErr } = await supabase.from('pedido_items').insert(
          items.map(item => ({
            pedido_id:         id,
            producto_id:       item.producto_id,
            cantidad:          parseFloat(item.cantidad),
            precio_unitario:   parseFloat(item.precio_unitario),
            precio_referencia: parseFloat(item.precio_referencia),
            bidon_nuevo:       item.bidon_nuevo,
            costo_snapshot:    costoMap[item.producto_id] ?? 0,
          }))
        )
        if (insErr) throw new Error(insErr.message)
      }

      const { data: updated, error } = await supabase
        .from('pedidos').select(LIST_SELECT).eq('id', id).single()

      if (error) throw new Error(error.message)
      return parsePedido(updated)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: [...KEY, id] })
    },
  })
}

// ─── useCambiarEstado ─────────────────────────────────────────────────────────

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
        estadoAnterior = data?.estado as EstadoPedido
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
      const snapshots = qc.getQueriesData<PedidoConCliente[]>({ queryKey: KEY })
      qc.setQueriesData<PedidoConCliente[]>({ queryKey: KEY }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(p => p.id === id ? { ...p, estado } : p)
      })
      return { snapshots }
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['produccion'] })
    },
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
      const snapshots = qc.getQueriesData<PedidoConCliente[]>({ queryKey: KEY })
      qc.setQueriesData<PedidoConCliente[]>({ queryKey: KEY }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(p => p.id === id ? { ...p, estado: 'anulado' } : p)
      })
      return { snapshots }
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['produccion'] })
    },
  })
}

// ─── useCerrarPedido ──────────────────────────────────────────────────────────
// Cierra un pedido registrando N pagos y actualizando saldo del cliente.

export const useCerrarPedido = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async ({ id, clienteId, estadoActual, pagos, totalPedido: totalPed, notas_entrega, fecha_pago }: {
      id:             string
      clienteId:      string
      estadoActual:   EstadoPedido
      pagos:          PagoInput[]
      totalPedido:    number
      notas_entrega?: string
      fecha_pago?:    string
    }) => {
      const montoTotalPagado = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
      const diferencia       = totalPed - montoTotalPagado
      const estadoPago: 'cobrado' | 'pendiente' = diferencia > 0 ? 'pendiente' : 'cobrado'
      const fechaPago        = fecha_pago ?? new Date().toISOString().split('T')[0]
      const fechaCobro       = montoTotalPagado > 0 ? fechaPago : null

      // 1. Cambiar estado a cerrado + campos de pago
      const { error: updateErr } = await supabase
        .from('pedidos')
        .update({
          estado:        'cerrado',
          estado_pago:   estadoPago,
          notas_entrega: notas_entrega ?? null,
          fecha_cobro:   fechaCobro,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', id)
      if (updateErr) throw new Error(updateErr.message)

      // 2. Registrar en historial
      const { error: histErr } = await supabase
        .from('pedido_historial')
        .insert({
          pedido_id:       id,
          estado_anterior: estadoActual,
          estado_nuevo:    'cerrado',
          usuario_id:      usuario?.id ?? null,
          notas:           null,
        })
      if (histErr) throw new Error(histErr.message)

      // 3. Insertar pagos (omitir filas con monto 0)
      const pagosValidos = pagos.filter(p => (parseFloat(p.monto) || 0) > 0)
      if (pagosValidos.length > 0) {
        const { error: pagosErr } = await supabase
          .from('pedido_pagos')
          .insert(pagosValidos.map(p => ({
            pedido_id:  id,
            forma_pago: p.forma_pago,
            monto:      parseFloat(p.monto),
            fecha_pago: fechaPago,
          })))
        if (pagosErr) throw new Error(pagosErr.message)
      }

      // 4. Actualizar saldo del cliente (reemplaza valor anterior)
      const { error: saldoErr } = await supabase
        .from('clientes')
        .update({ saldo_pendiente: diferencia })
        .eq('id', clienteId)
      if (saldoErr) throw new Error(saldoErr.message)
    },

    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const snapshots = qc.getQueriesData<PedidoConCliente[]>({ queryKey: KEY })
      qc.setQueriesData<PedidoConCliente[]>({ queryKey: KEY }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(p => p.id === id ? { ...p, estado: 'cerrado' as EstadoPedido } : p)
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
    mutationFn: async ({ id, forma_cobro, monto_cobrado, estado_pago, fecha_cobro }: {
      id:              string
      forma_cobro:     string
      monto_cobrado?:  string
      estado_pago?:    'cobrado' | 'pendiente'
      fecha_cobro?:    string
    }) => {
      const patch: Record<string, unknown> = {
        forma_cobro,
        monto_cobrado: monto_cobrado ? parseFloat(monto_cobrado) : null,
        updated_at:    new Date().toISOString(),
      }
      if (estado_pago !== undefined) patch.estado_pago = estado_pago
      if (fecha_cobro !== undefined) {
        patch.fecha_cobro = forma_cobro === 'pendiente'
          ? null
          : (fecha_cobro || new Date().toISOString().split('T')[0])
      }

      const { error } = await supabase
        .from('pedidos')
        .update(patch)
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
