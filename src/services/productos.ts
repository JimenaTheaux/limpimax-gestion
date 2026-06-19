import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Producto, CategoriaProducto } from '@/types'

// ─── Helper de transformación ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProducto(row: any): Producto & { categoriaNombre?: string } {
  return {
    id:              row.id,
    codigo:          row.codigo          ?? null,
    nombre:          row.nombre,
    fragancia:       row.fragancia       ?? null,
    categoriaId:     row.categoria_id    ?? null,
    unidadMedida:    row.unidad_medida   ?? 'litros',
    presentacion:    String(row.presentacion),
    precioMinorista: String(row.precio_minorista),
    precioMayorista: String(row.precio_mayorista),
    activo:          row.activo,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
    categoria:       row.categorias_producto
      ? { id: row.categorias_producto.id, nombre: row.categorias_producto.nombre }
      : undefined,
    categoriaNombre: row.categorias_producto?.nombre,
  }
}

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEY     = ['productos']
const CAT_KEY = ['categorias']

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useProductos = (q?: string, categoriaId?: string) =>
  useQuery({
    queryKey: [...KEY, q, categoriaId],
    queryFn: async () => {
      let query = supabase
        .from('productos')
        .select('*, categorias_producto(id, nombre)')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (categoriaId) query = query.eq('categoria_id', categoriaId)
      if (q)           query = query.ilike('nombre', `%${q}%`)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []).map(toProducto)
    },
  })

export const useCategorias = () =>
  useQuery({
    queryKey: CAT_KEY,
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
    mutationFn: async (data: Partial<Producto>) => {
      const { data: created, error } = await supabase
        .from('productos')
        .insert({
          nombre:           data.nombre,
          fragancia:        data.fragancia        || null,
          categoria_id:     data.categoriaId      || null,
          unidad_medida:    data.unidadMedida      ?? 'litros',
          presentacion:     parseFloat(data.presentacion ?? '0'),
          precio_minorista: parseFloat(data.precioMinorista ?? '0'),
          precio_mayorista: parseFloat(data.precioMayorista ?? '0'),
          activo:           data.activo            ?? true,
        })
        .select('*, categorias_producto(id, nombre)')
        .maybeSingle()

      if (error) throw new Error(error.message)
      return toProducto(created!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Producto> & { id: string }) => {
      const patch: Record<string, unknown> = {}
      if (data.nombre          !== undefined) patch.nombre           = data.nombre
      if (data.fragancia       !== undefined) patch.fragancia        = data.fragancia       || null
      if (data.categoriaId     !== undefined) patch.categoria_id     = data.categoriaId     || null
      if (data.unidadMedida    !== undefined) patch.unidad_medida    = data.unidadMedida
      if (data.presentacion    !== undefined) patch.presentacion     = parseFloat(data.presentacion)
      if (data.precioMinorista !== undefined) patch.precio_minorista = parseFloat(data.precioMinorista)
      if (data.precioMayorista !== undefined) patch.precio_mayorista = parseFloat(data.precioMayorista)
      if (data.activo          !== undefined) patch.activo           = data.activo

      const { data: updated, error } = await supabase
        .from('productos')
        .update(patch)
        .eq('id', id)
        .select('*, categorias_producto(id, nombre)')
        .maybeSingle()

      if (error) throw new Error(error.message)
      return toProducto(updated!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
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
        .maybeSingle()

      if (error) throw new Error(error.message)
      return data as CategoriaProducto
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CAT_KEY }),
  })
}
