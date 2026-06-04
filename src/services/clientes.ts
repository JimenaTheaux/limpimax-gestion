import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Cliente } from '@/types'

const KEY = ['clientes']

export const useClientes = (q?: string) =>
  useQuery({
    queryKey: [...KEY, q],
    queryFn:  () => api.get<Cliente[]>(`/api/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })

export const useCliente = (id: string) =>
  useQuery({
    queryKey:  [...KEY, id],
    queryFn:   () => api.get<Cliente>(`/api/clientes/${id}`),
    enabled:   !!id,
  })

export const useCrearCliente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Cliente>) => api.post<Cliente>('/api/clientes', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarCliente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Cliente> & { id: string }) =>
      api.patch<Cliente>(`/api/clientes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
