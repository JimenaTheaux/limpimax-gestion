// Script: crea (o recrea) las tablas de better-auth con camelCase — requerido por Kysely
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// 1. Borrar tablas anteriores (snake_case incorrectas)
const drops = [
  `DROP TABLE IF EXISTS "verification" CASCADE`,
  `DROP TABLE IF EXISTS "account" CASCADE`,
  `DROP TABLE IF EXISTS "session" CASCADE`,
  `DROP TABLE IF EXISTS "user" CASCADE`,
]

// 2. Crear con camelCase — así las usa better-auth v1 internamente
const creates = [
  `CREATE TABLE IF NOT EXISTS "user" (
    "id"            TEXT      NOT NULL PRIMARY KEY,
    "name"          TEXT      NOT NULL,
    "email"         TEXT      NOT NULL UNIQUE,
    "emailVerified" BOOLEAN   NOT NULL DEFAULT false,
    "image"         TEXT,
    "role"          TEXT      DEFAULT 'admin',
    "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id"          TEXT      NOT NULL PRIMARY KEY,
    "expiresAt"   TIMESTAMP NOT NULL,
    "token"       TEXT      NOT NULL UNIQUE,
    "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
    "ipAddress"   TEXT,
    "userAgent"   TEXT,
    "userId"      TEXT      NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "account" (
    "id"                     TEXT      NOT NULL PRIMARY KEY,
    "accountId"              TEXT      NOT NULL,
    "providerId"             TEXT      NOT NULL,
    "userId"                 TEXT      NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken"            TEXT,
    "refreshToken"           TEXT,
    "idToken"                TEXT,
    "accessTokenExpiresAt"   TIMESTAMP,
    "refreshTokenExpiresAt"  TIMESTAMP,
    "scope"                  TEXT,
    "password"               TEXT,
    "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id"         TEXT      NOT NULL PRIMARY KEY,
    "identifier" TEXT      NOT NULL,
    "value"      TEXT      NOT NULL,
    "expiresAt"  TIMESTAMP NOT NULL,
    "createdAt"  TIMESTAMP DEFAULT now(),
    "updatedAt"  TIMESTAMP DEFAULT now()
  )`,
]

console.log('Recreando tablas better-auth (camelCase)...')

for (const stmt of drops) {
  await sql.query(stmt)
}

for (const stmt of creates) {
  const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1]
  await sql.query(stmt)
  console.log(`  ✓ tabla "${tableName}"`)
}

console.log('✓ Schema better-auth listo\n')
