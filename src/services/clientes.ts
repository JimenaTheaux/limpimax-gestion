import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Cliente } from '@/types'

// ─── Helper de transformación ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCliente(row: any): Cliente {
  return {
    id:          row.id,
    nombre:      row.nombre,
    cuit:        row.cuit         ?? null,
    telefono:    row.telefono     ?? null,
    direccion:   row.direccion    ?? null,
    tipocliente: row.tipo_cliente,
    notas:       row.notas        ?? null,
    activo:      row.activo,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  }
}

// ─── Query key ────────────────────────────────────────────────────────────────

const KEY = ['clientes']

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useClientes = (q?: string) =>
  useQuery({
    queryKey:        [...KEY, q],
    placeholderData: keepPreviousData,    // sin flash al cambiar búsqueda
    staleTime:       1000 * 60 * 2,      // 2 min — clientes no cambian seguido
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('id,nombre,cuit,telefono,direccion,tipo_cliente,notas,activo,created_at,updated_at')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (q) {
        query = query.ilike('nombre', `%${q}%`)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []).map(toCliente)
    },
  })

export const useCliente = (id: string) =>
  useQuery({
    queryKey:  [...KEY, id],
    enabled:   !!id,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id,nombre,cuit,telefono,direccion,tipo_cliente,notas,activo,created_at,updated_at')
        .eq('id', id)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data)  throw new Error('Cliente no encontrado')
      return toCliente(data)
    },
  })

export const useCrearCliente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Cliente>) => {
      const { data: created, error } = await supabase
        .from('clientes')
        .insert({
          nombre:       data.nombre,
          telefono:     data.telefono   || null,
          direccion:    data.direccion  || null,
          tipo_cliente: data.tipocliente ?? 'minorista',
          notas:        data.notas      || null,
          activo:       data.activo     ?? true,
        })
        .select('id,nombre,cuit,telefono,direccion,tipo_cliente,notas,activo,created_at,updated_at')
        .maybeSingle()

      if (error)   throw new Error(error.message)
      if (!created) throw new Error('No se pudo crear el cliente')
      return toCliente(created)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarCliente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Cliente> & { id: string }) => {
      const patch: Record<string, unknown> = {}
      if (data.nombre      !== undefined) patch.nombre       = data.nombre
      if (data.telefono    !== undefined) patch.telefono     = data.telefono   || null
      if (data.direccion   !== undefined) patch.direccion    = data.direccion  || null
      if (data.tipocliente !== undefined) patch.tipo_cliente = data.tipocliente
      if (data.notas       !== undefined) patch.notas        = data.notas      || null
      if (data.activo      !== undefined) patch.activo       = data.activo

      const { data: updated, error } = await supabase
        .from('clientes')
        .update(patch)
        .eq('id', id)
        .select('id,nombre,cuit,telefono,direccion,tipo_cliente,notas,activo,created_at,updated_at')
        .maybeSingle()

      if (error) throw new Error(error.message)
      return toCliente(updated!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
