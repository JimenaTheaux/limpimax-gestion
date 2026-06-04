import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_API_URL ?? 'http://localhost:5173'),
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient
