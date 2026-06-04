// Script one-shot: crea 3 usuarios de prueba (uno por rol)
import { betterAuth } from 'better-auth'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const auth = betterAuth({
  database: pool,
  secret:   process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, autoSignIn: false },
  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'admin' },
    },
  },
})

const USUARIOS = [
  { name: 'Admin Limpimax',       email: 'admin@limpimax.com',       password: 'limpimax123', role: 'admin' },
  { name: 'Operario Producción',  email: 'produccion@limpimax.com',  password: 'limpimax123', role: 'produccion' },
  { name: 'Repartidor Limpimax',  email: 'repartidor@limpimax.com',  password: 'limpimax123', role: 'repartidor' },
]

for (const u of USUARIOS) {
  try {
    await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: u.password } })
    // Asignar rol (additionalFields puede no propagarse en signup — lo seteamos directo)
    await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [u.role, u.email])
    console.log(`  ✓ ${u.role.padEnd(12)} ${u.email}`)
  } catch (err) {
    if (err.message?.includes('already exists') || err.message?.includes('duplicate') || err.message?.includes('unique')) {
      // Ya existe — solo actualizar rol
      await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [u.role, u.email])
      console.log(`  ~ ${u.role.padEnd(12)} ${u.email} (ya existía, rol actualizado)`)
    } else {
      console.error(`  ✗ ${u.email}: ${err.message}`)
    }
  }
}

await pool.end()
console.log('\n✓ Usuarios listos')
