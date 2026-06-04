import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:    './db/schema.ts',
  out:       './db/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Excluir tablas de better-auth — las gestiona su propio migrador
  tablesFilter: ['!user', '!session', '!account', '!verification'],
})
