import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Producto, ProductoPresentacion, CategoriaProducto } from '@/types'

export interface PresentacionInput {
  presentacion:      number
  precio_minorista:  number
  precio_mayorista:  number
  costo_produccion:  number
}

// Supabase devuelve NUMERIC como string — parseamos a number para coincidir con el tipo
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePresentacion(row: any): ProductoPresentacion {
  return {
    ...row,
    presentacion:      Number(row.presentacion),
    precio_minorista:  Number(row.precio_minorista),
    precio_mayorista:  Number(row.precio_mayorista),
    costo_produccion:  Number(row.costo_produccion ?? 0),
  } as ProductoPresentacion
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProducto(row: any): Producto {
  return {
    ...row,
    categorias_producto:     row.categorias_producto ?? null,
    producto_presentaciones: (row.producto_presentaciones ?? []).map(parsePresentacion),
  } as Producto
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useProductos = (q?: string, categoriaId?: string, activo: boolean | null = true) =>
  useQuery({
    queryKey:        queryKeys.productos.list(q, categoriaId, activo),
    placeholderData: keepPreviousData,
    staleTime:       1000 * 60 * 5,
    queryFn: async () => {
      let query = supabase
        .from('productos')
        .select('*, categorias_producto(id, nombre), producto_presentaciones(*)')
        .order('nombre', { ascending: true })

      if (activo !== null) query = query.eq('activo', activo)
      if (categoriaId)     query = query.eq('categoria_id', categoriaId)
      if (q)               query = query.ilike('nombre', `%${q}%`)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []).map(parseProducto)
    },
  })

export const useCategorias = () =>
  useQuery({
    queryKey:  queryKeys.productos.categorias(),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_producto')
        .select('id, nombre')
        .order('nombre', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as CategoriaProducto[]
    },
  })

export const useCrearProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ presentaciones, ...datos }: {
      nombre:         string
      categoria_id:   string | null
      activo?:        boolean
      presentaciones: PresentacionInput[]
    }) => {
      const { data: producto, error: e1 } = await supabase
        .from('productos')
        .insert({
          nombre:       datos.nombre,
          categoria_id: datos.categoria_id || null,
          activo:       datos.activo ?? true,
        })
        .select('id')
        .single()

      if (e1) throw new Error(e1.message)

      const { error: e2 } = await supabase.from('producto_presentaciones').insert(
        presentaciones.map(p => ({
          producto_id:       producto.id,
          presentacion:      p.presentacion,
          precio_minorista:  p.precio_minorista,
          precio_mayorista:  p.precio_mayorista,
          costo_produccion:  p.costo_produccion,
        }))
      )
      if (e2) throw new Error(e2.message)

      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias_producto(id, nombre), producto_presentaciones(*)')
        .eq('id', producto.id)
        .single()
      if (error) throw new Error(error.message)
      return parseProducto(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.productos.all() }),
  })
}

export const useEditarProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, presentaciones, ...datos }: {
      id:             string
      nombre?:        string
      categoria_id?:  string | null
      activo?:        boolean
      presentaciones?: PresentacionInput[]
    }) => {
      const patch: Record<string, unknown> = {}
      if (datos.nombre       !== undefined) patch.nombre       = datos.nombre
      if (datos.categoria_id !== undefined) patch.categoria_id = datos.categoria_id || null
      if (datos.activo       !== undefined) patch.activo       = datos.activo

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from('productos').update(patch).eq('id', id)
        if (error) throw new Error(error.message)
      }

      if (presentaciones) {
        const { error: delErr } = await supabase.from('producto_presentaciones').delete().eq('producto_id', id)
        if (delErr) throw new Error(delErr.message)

        const { error: insErr } = await supabase.from('producto_presentaciones').insert(
          presentaciones.map(p => ({
            producto_id:       id,
            presentacion:      p.presentacion,
            precio_minorista:  p.precio_minorista,
            precio_mayorista:  p.precio_mayorista,
            costo_produccion:  p.costo_produccion,
          }))
        )
        if (insErr) throw new Error(insErr.message)
      }

      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias_producto(id, nombre), producto_presentaciones(*)')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)
      return parseProducto(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.productos.all() }),
  })
}

export const useCrearCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('categorias_producto')
        .insert({ nombre })
        .select('id, nombre')
        .single()

      if (error) throw new Error(error.message)
      return data as CategoriaProducto
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.productos.categorias() }),
  })
}

export const useEditarCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { data, error } = await supabase
        .from('categorias_producto')
        .update({ nombre })
        .eq('id', id)
        .select('id, nombre')
        .single()

      if (error) throw new Error(error.message)
      return data as CategoriaProducto
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productos.categorias() })
      qc.invalidateQueries({ queryKey: queryKeys.productos.all() })
    },
  })
}

export const useBorrarCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Bloquear si hay productos activos en esta categoría
      const { count, error: countErr } = await supabase
        .from('productos')
        .select('id', { count: 'exact', head: true })
        .eq('categoria_id', id)
        .eq('activo', true)

      if (countErr) throw new Error(countErr.message)
      if (count && count > 0) throw new Error('HAS_ACTIVE_PRODUCTS')

      // Desasociar productos inactivos que referencian esta categoría
      await supabase.from('productos').update({ categoria_id: null }).eq('categoria_id', id)

      const { error } = await supabase.from('categorias_producto').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productos.categorias() })
      qc.invalidateQueries({ queryKey: queryKeys.productos.all() })
    },
  })
}

export const useBorrarProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: presentaciones, error: presErr } = await supabase
        .from('producto_presentaciones')
        .select('id')
        .eq('producto_id', id)
      if (presErr) throw new Error(presErr.message)

      const presentacionIds = (presentaciones ?? []).map(p => p.id)
      if (presentacionIds.length > 0) {
        const { count, error: countErr } = await supabase
          .from('pedido_items')
          .select('id', { count: 'exact', head: true })
          .in('presentacion_id', presentacionIds)

        if (countErr) throw new Error(countErr.message)
        if (count && count > 0) throw new Error('HAS_ORDERS')
      }

      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.productos.all() }),
  })
}
