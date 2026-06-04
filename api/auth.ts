import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
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

  secret: process.env.BETTER_AUTH_SECRET!,

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
    ? [process.env.BETTER_AUTH_URL!]
    : DEV_ORIGINS,
})

export type Auth = typeof auth
