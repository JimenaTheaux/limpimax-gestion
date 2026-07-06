import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { CategoriaEgreso } from '@/types'

// ─── useCategoriaEgresos ──────────────────────────────────────────────────────

export const useCategoriaEgresos = () =>
  useQuery({
    queryKey:  queryKeys.categoriasEgreso.all(),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_egreso')
        .select('id, nombre, color_bg, color_texto')
        .order('nombre', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as CategoriaEgreso[]
    },
  })

// ─── useCrearCategoriaEgreso ──────────────────────────────────────────────────

export const useCrearCategoriaEgreso = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('categorias_egreso')
        .insert({ nombre, color_bg: '#F4F6F8', color_texto: '#4A5568' })
        .select('id, nombre, color_bg, color_texto')
        .single()
      if (error) throw new Error(error.message)
      return data as CategoriaEgreso
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categoriasEgreso.all() }),
  })
}

// ─── useEditarCategoriaEgreso ─────────────────────────────────────────────────

export const useEditarCategoriaEgreso = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { data, error } = await supabase
        .from('categorias_egreso')
        .update({ nombre })
        .eq('id', id)
        .select('id, nombre, color_bg, color_texto')
        .single()
      if (error) throw new Error(error.message)
      return data as CategoriaEgreso
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.categoriasEgreso.all() })
      qc.invalidateQueries({ queryKey: queryKeys.egresos.all() })
    },
  })
}

// ─── useBorrarCategoriaEgreso ─────────────────────────────────────────────────

export const useBorrarCategoriaEgreso = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countErr } = await supabase
        .from('egresos')
        .select('id', { count: 'exact', head: true })
        .eq('categoria_id', id)

      if (countErr) throw new Error(countErr.message)
      if (count && count > 0) throw new Error('HAS_EGRESOS')

      const { error } = await supabase.from('categorias_egreso').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categoriasEgreso.all() }),
  })
}
