import { betterAuth } from 'better-auth'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'

// In Node.js there is no native WebSocket. @neondatabase/serverless Pool connects to
// Neon over WebSocket (port 443) — far more reliable in serverless than pg TCP (port 5432).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(neonConfig as any).webSocketConstructor = ws

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://not-configured/limpimax',
})

// En dev el puerto de Vite varía (5173, 5174, 5175…). Aceptamos cualquier localhost.
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://localhost:3001',
]

const isProd = process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  database: pool,

  secret: process.env.BETTER_AUTH_SECRET ?? 'change-me-in-vercel-env-vars',

  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',

  emailAndPassword: {
    enabled:    true,
    autoSignIn: true,
  },

  session: {
    expiresIn:   60 * 60 * 24 * 365,
    updateAge:   60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge:  60 * 5,
    },
  },

  user: {
    additionalFields: {
      role: {
        type:         'string',
        required:     false,
        defaultValue: 'admin',
      },
    },
  },

  trustedOrigins: isProd
    ? [
        process.env.BETTER_AUTH_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      ].filter(Boolean) as string[]
    : DEV_ORIGINS,
})

export type Auth = typeof auth
