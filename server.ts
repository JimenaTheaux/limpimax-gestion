import { serve } from '@hono/node-server'
import app from './api/_app'

const PORT = Number(process.env.PORT ?? 3000)

// hostname: '0.0.0.0' escucha tanto en IPv4 como IPv6 — necesario en Windows
serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, () => {
  console.log(`\n  API server  →  http://localhost:${PORT}/api`)
  console.log(`  Auth        →  http://localhost:${PORT}/api/auth\n`)
})
