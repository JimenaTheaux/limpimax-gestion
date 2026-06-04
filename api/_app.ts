import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './auth'
import { requireAuth } from './middleware/auth'
import clientesRouter   from './routes/clientes'
import productosRouter  from './routes/productos'
import usuariosRouter   from './routes/usuarios'
import pedidosRouter    from './routes/pedidos'
import produccionRouter from './routes/produccion'
import dashboardRouter  from './routes/dashboard'

const app = new Hono().basePath('/api')

// ─── Middleware global ────────────────────────────────────────────────────────

app.use('*', logger())

const isProd = process.env.NODE_ENV === 'production'

app.use('*', cors({
  origin: isProd
    ? [process.env.BETTER_AUTH_URL ?? '']
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
  credentials: true,
}))

// ─── Auth (better-auth maneja /api/auth/*) ───────────────────────────────────
// app.use con wildcard matchea rutas anidadas: /auth/sign-in/email, /auth/get-session, etc.

app.use('/auth/*', (c) => auth.handler(c.req.raw))

// ─── Rutas del negocio (requieren sesión válida) ─────────────────────────────

app.use('/clientes/*',   requireAuth)
app.use('/productos/*',  requireAuth)
app.use('/usuarios/*',   requireAuth)
app.use('/pedidos/*',    requireAuth)
app.use('/produccion/*', requireAuth)
app.use('/dashboard/*',  requireAuth)

app.route('/clientes',   clientesRouter)
app.route('/productos',  productosRouter)
app.route('/usuarios',   usuariosRouter)
app.route('/pedidos',    pedidosRouter)
app.route('/produccion', produccionRouter)
app.route('/dashboard',  dashboardRouter)

export default app
