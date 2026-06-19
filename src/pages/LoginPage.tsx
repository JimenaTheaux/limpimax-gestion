import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { Rol } from '@/types'

const RUTA_POR_ROL: Record<Rol, string> = {
  admin:      '/admin',
  superadmin: '/admin',
  produccion: '/produccion',
  repartidor: '/repartidor',
}

export default function LoginPage() {
  const navigate              = useNavigate()
  const { login, usuario, cargando } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const emailRef    = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!cargando && usuario) {
      navigate(RUTA_POR_ROL[usuario.rol as Rol] ?? '/admin', { replace: true })
    }
  }, [cargando, usuario, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError('')

    try {
      await login(email.trim().toLowerCase(), password)
      // La navegación la dispara el useEffect cuando `usuario` se actualiza
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setLoading(false)
      emailRef.current?.focus()
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0D5C8A 0%, #1B9ED6 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: -1,
            marginBottom: 16,
          }}>
            LM
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, color: '#fff', margin: 0 }}>
            Limpimax
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
            Sistema de gestión de pedidos
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A2B3C', marginBottom: 24 }}>
            Iniciá sesión
          </h2>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label className="form-label">
              <input
                ref={emailRef}
                className="input"
                type="email"
                placeholder=" "
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
              <span>Email</span>
            </label>

            <label className="form-label">
              <input
                ref={passwordRef}
                className="input"
                type="password"
                placeholder=" "
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
              <span>Contraseña</span>
            </label>

            {error && (
              <div style={{
                background: '#FDECEA', border: '1px solid #D32F2F',
                borderRadius: 10, padding: '10px 14px',
                color: '#D32F2F', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background:  !canSubmit ? 'rgba(13,92,138,0.5)' : '#0D5C8A',
                color:       '#fff', border: 'none', borderRadius: 10,
                padding:     '13px 20px', minHeight: 44,
                fontSize:    15, fontWeight: 600,
                cursor:      !canSubmit ? 'not-allowed' : 'pointer',
                transition:  'background 0.2s ease',
                display:     'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop:   4,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          Sin acceso? Contactá al administrador.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
