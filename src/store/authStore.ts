import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Rol } from '@/types'

interface UsuarioActual {
  id:     string
  nombre: string
  email:  string
  rol:    Rol
}

interface AuthState {
  usuario: UsuarioActual | null
  token:   string | null
  setUser:  (usuario: UsuarioActual) => void
  setToken: (token: string) => void
  logout:   () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      token:   null,

      setUser: (usuario) => set({ usuario }),

      setToken: (token) => set({ token }),

      logout: () => set({ usuario: null, token: null }),
    }),
    {
      name: 'limpimax-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        token:   state.token,
      }),
    }
  )
)
