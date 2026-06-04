import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Producto, CategoriaProducto } from '@/types'

const KEY     = ['productos']
const CAT_KEY = ['categorias']

export const useProductos = (q?: string, categoriaId?: string) =>
  useQuery({
    queryKey: [...KEY, q, categoriaId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q)           params.set('q', q)
      if (categoriaId) params.set('categoriaId', categoriaId)
      const qs = params.toString()
      return api.get<(Producto & { categoriaNombre?: string })[]>(
        `/api/productos${qs ? `?${qs}` : ''}`
      )
    },
  })

export const useCategorias = () =>
  useQuery({
    queryKey: CAT_KEY,
    queryFn:  () => api.get<CategoriaProducto[]>('/api/productos/categorias'),
  })

export const useCrearProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Producto>) => api.post<Producto>('/api/productos', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Producto> & { id: string }) =>
      api.patch<Producto>(`/api/productos/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useCrearCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => api.post<CategoriaProducto>('/api/productos/categorias', { nombre }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: CAT_KEY }),
  })
}
