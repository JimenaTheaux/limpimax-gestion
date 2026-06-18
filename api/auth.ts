import { betterAuth } from 'better-auth'
import { neon } from '@neondatabase/serverless'

// Use the HTTP-based neon() driver instead of Pool.
// Pool (WebSocket) has reliability issues in Vercel serverless; neon() uses HTTP
// fetch (port 443) which is guaranteed to work in any serverless environment.
// Verified: neon().query(text, params, { fullResults: true }) returns the same
// { rows, rowCount, fields } format that better-auth expects from a pg Pool.
const sql = neon(process.env.DATABASE_URL ?? 'postgresql://not-configured/limpimax')

const db = {
  query: (queryText: string, values?: unknown[]) =>
    sql.query(queryText, (values ?? []) as never[], { fullResults: true } as never),
}

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
  database: db,

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
