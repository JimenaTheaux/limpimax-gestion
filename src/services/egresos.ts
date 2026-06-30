import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Egreso } from '@/types'

const KEY = ['egresos']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ultimoDiaMes(anio: number, mes: number): string {
  return new Date(anio, mes, 0).toISOString().split('T')[0]
}

function primerDiaMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-01`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEgreso(row: any): Egreso {
  return {
    ...row,
    monto: Number(row.monto ?? 0),
  } as Egreso
}

// ─── useEgresos ───────────────────────────────────────────────────────────────

export const useEgresos = (mes: number, anio: number, categoriaId?: string) =>
  useQuery({
    queryKey:  [...KEY, mes, anio, categoriaId ?? null],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      let q = supabase
        .from('egresos')
        .select('*, perfiles(nombre), categorias_egreso(id, nombre, color_bg, color_texto)')
        .gte('fecha_egreso', primerDiaMes(anio, mes))
        .lte('fecha_egreso', ultimoDiaMes(anio, mes))
        .order('fecha_egreso', { ascending: false })

      if (categoriaId) q = q.eq('categoria_id', categoriaId)

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []).map(parseEgreso)
    },
  })

// ─── useCrearEgreso ───────────────────────────────────────────────────────────

export const useCrearEgreso = () => {
  const qc      = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)

  return useMutation({
    mutationFn: async (datos: {
      fecha_egreso:    string
      categoria_id:    string
      concepto:        string
      monto:           number
      registrado_por?: string
    }) => {
      const { data, error } = await supabase
        .from('egresos')
        .insert({
          fecha_egreso:   datos.fecha_egreso,
          categoria_id:   datos.categoria_id,
          concepto:       datos.concepto,
          monto:          datos.monto,
          registrado_por: datos.registrado_por ?? usuario?.id ?? null,
        })
        .select('*, perfiles(nombre), categorias_egreso(id, nombre, color_bg, color_texto)')
        .single()

      if (error) throw new Error(error.message)
      return parseEgreso(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useEditarEgreso ──────────────────────────────────────────────────────────

export const useEditarEgreso = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...datos }: Partial<Omit<Egreso, 'created_at' | 'updated_at' | 'perfiles' | 'categorias_egreso'>> & { id: string }) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (datos.fecha_egreso   !== undefined) patch.fecha_egreso   = datos.fecha_egreso
      if (datos.categoria_id   !== undefined) patch.categoria_id   = datos.categoria_id
      if (datos.concepto       !== undefined) patch.concepto       = datos.concepto
      if (datos.monto          !== undefined) patch.monto          = datos.monto
      if (datos.registrado_por !== undefined) patch.registrado_por = datos.registrado_por

      const { data, error } = await supabase
        .from('egresos')
        .update(patch)
        .eq('id', id)
        .select('*, perfiles(nombre), categorias_egreso(id, nombre, color_bg, color_texto)')
        .single()

      if (error) throw new Error(error.message)
      return parseEgreso(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── useEliminarEgreso ────────────────────────────────────────────────────────

export const useEliminarEgreso = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('egresos')
        .delete()
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const snapshots = qc.getQueriesData<Egreso[]>({ queryKey: KEY })
      qc.setQueriesData<Egreso[]>({ queryKey: KEY }, (old) => {
        if (!Array.isArray(old)) return old
        return old.filter(e => e.id !== id)
      })
      return { snapshots }
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
