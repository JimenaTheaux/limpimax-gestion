import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Perfil, Rol } from '@/types'

// Cliente con service_role — solo para operaciones de Admin sobre auth.users.
// La key se expone en VITE_ solo para poder usar esta feature desde el cliente
// (solo admins llegan a esta pantalla; RLS protege el resto).
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export interface UsuarioConEmail extends Omit<Perfil, 'updatedAt'> {
  email:     string
  user_id:   string
  updatedAt: string
}

const KEY = ['usuarios']

// ─── Listar usuarios ──────────────────────────────────────────────────────────

export const useUsuarios = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data: perfiles, error } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre, rol, activo, created_at, updated_at')
        .order('nombre')

      if (error) throw new Error(error.message)

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
      if (authErr) throw new Error(authErr.message)

      const emailMap = new Map(authData.users.map(u => [u.id, u.email ?? '']))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (perfiles ?? []).map((p: any): UsuarioConEmail => ({
        id:        p.id,
        userId:    p.id,
        user_id:   p.id,
        nombre:    p.nombre,
        rol:       p.rol as Rol,
        activo:    p.activo,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        email:     emailMap.get(p.id) ?? '',
      }))
    },
  })

// ─── Crear usuario ────────────────────────────────────────────────────────────

export const useCrearUsuario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { nombre: string; email: string; password: string; rol: string }) => {
      // 1. Crear en auth.users con email confirmado
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email:         data.email,
        password:      data.password,
        email_confirm: true,
        user_metadata: { nombre: data.nombre, rol: data.rol },
      })

      if (authErr) throw new Error(authErr.message)
      const userId = authUser.user.id

      // 2. Insertar perfil
      const { error: perfilErr } = await supabase
        .from('perfiles')
        .insert({ id: userId, nombre: data.nombre, rol: data.rol, activo: true })

      if (perfilErr) {
        // Revertir: eliminar usuario de auth si falla el perfil
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw new Error(perfilErr.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ─── Editar usuario ───────────────────────────────────────────────────────────

export const useEditarUsuario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nombre?: string; rol?: string; activo?: boolean }) => {
      const patch: Record<string, unknown> = {}
      if (data.nombre !== undefined) patch.nombre = data.nombre
      if (data.rol    !== undefined) patch.rol    = data.rol
      if (data.activo !== undefined) patch.activo = data.activo

      const { error } = await supabase
        .from('perfiles')
        .update(patch)
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
