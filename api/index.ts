import { getRequestListener } from '@hono/node-server'
import app from './app.js'

// hono/vercel handle() is for Edge runtime and returns a Response (Web fetch style).
// Vercel Node.js runtime expects (req, res) => void — getRequestListener bridges that gap.
export const config = { runtime: 'nodejs' }

export default getRequestListener(app.fetch)
