import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Perfil } from '@/types'

export interface UsuarioConEmail extends Perfil {
  email:   string
  user_id: string   // snake_case de la query SQL raw
}

const KEY = ['usuarios']

export const useUsuarios = () =>
  useQuery({
    queryKey: KEY,
    queryFn:  () => api.get<UsuarioConEmail[]>('/api/usuarios'),
  })

export const useCrearUsuario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; email: string; password: string; rol: string }) =>
      api.post<UsuarioConEmail>('/api/usuarios', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useEditarUsuario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nombre?: string; rol?: string; activo?: boolean }) =>
      api.patch<Perfil>(`/api/usuarios/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
