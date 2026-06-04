import { useEffect } from 'react'
import { useSession, signIn, signOut } from '@/lib/auth-client'
import { useAuthStore } from '@/store/authStore'
import type { Rol } from '@/types'

export function useAuth() {
  const { data: session, isPending } = useSession()
  const { usuario, setUser, logout } = useAuthStore()

  // Sincroniza la sesión de better-auth con el store de Zustand
  useEffect(() => {
    if (session?.user) {
      setUser({
        id:     session.user.id,
        nombre: session.user.name,
        email:  session.user.email,
        rol:    ((session.user as { role?: string }).role ?? 'admin') as Rol,
      })
    } else if (!isPending && !session) {
      logout()
    }
  }, [session, isPending, setUser, logout])

  const login = async (email: string, password: string) => {
    const result = await signIn.email({ email, password })
    if (result.error) {
      throw new Error(result.error.message ?? 'Credenciales incorrectas. Intentá de nuevo.')
    }
    return result
  }

  const cerrarSesion = async () => {
    await signOut()
    logout()
  }

  return {
    usuario:     usuario ?? (session?.user ? {
      id:     session.user.id,
      nombre: session.user.name,
      email:  session.user.email,
      rol:    ((session.user as { role?: string }).role ?? 'admin') as Rol,
    } : null),
    cargando:    isPending,
    autenticado: !!session?.user,
    login,
    cerrarSesion,
  }
}
