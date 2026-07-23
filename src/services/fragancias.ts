import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Fragancia } from '@/types'

export const useFragancias = () =>
  useQuery({
    queryKey:  queryKeys.fragancias.list(),
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fragancias')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as Fragancia[]
    },
  })

export const useAllFragancias = () =>
  useQuery({
    queryKey:  queryKeys.fragancias.all(),
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fragancias')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as Fragancia[]
    },
  })

export const useCrearFragancia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('fragancias')
        .insert({ nombre, activo: true })
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      return data as Fragancia
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.all() })
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.list() })
    },
  })
}

export const useEditarFragancia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { data, error } = await supabase
        .from('fragancias')
        .update({ nombre })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      return data as Fragancia
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.all() })
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.list() })
    },
  })
}

export const useToggleFragancia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('fragancias').update({ activo }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.all() })
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.list() })
    },
  })
}

export const useBorrarFragancia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countErr } = await supabase
        .from('pedido_items')
        .select('id', { count: 'exact', head: true })
        .eq('fragancia_id', id)

      if (countErr) throw new Error(countErr.message)
      if (count && count > 0) throw new Error('HAS_ORDERS')

      const { error } = await supabase.from('fragancias').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.all() })
      qc.invalidateQueries({ queryKey: queryKeys.fragancias.list() })
    },
  })
}
