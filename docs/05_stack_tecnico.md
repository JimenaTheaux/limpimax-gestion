# 05 — Stack Técnico y Arquitectura

## Decisiones tecnológicas

### Frontend
- **Framework:** React 18+ con Vite
- **Tipo de app:** PWA (Progressive Web App)
  - Instalable en Android desde Chrome
  - Soporte offline con Service Worker + Cache API
  - Manifest con íconos e identidad visual
- **Estilos:** Tailwind CSS
- **Componentes UI:** shadcn/ui (sobre Tailwind, headless y accesible)
- **Routing:** React Router v6
- **Estado global:** Zustand
- **Formularios:** React Hook Form + Zod
- **Offline:** Workbox + IndexedDB (via `idb`)
- **Data fetching:** TanStack Query v5

### Backend / Base de datos
- **Base de datos:** Neon (PostgreSQL serverless en la nube)
- **ORM:** Drizzle ORM (TypeScript-first, genera tipos automáticos desde el esquema)
- **API:** Hono (framework web ultraliviano para Vercel Edge Functions)
- **Auth:** better-auth (manejo de sesiones JWT, email+password)

**Por qué Neon + Drizzle + Hono:**
- Neon: PostgreSQL real sin servidor propio, plan gratuito suficiente para MVP, escalable
- Drizzle: tipos TypeScript automáticos desde el esquema, migraciones simples, sin magia
- Hono: router extremadamente rápido en Vercel Edge, API en el mismo repo que el frontend
- better-auth: reemplaza Supabase Auth con control total del JWT y sesiones

### Deploy
- **Frontend + API:** Vercel (monorepo, un solo deploy)
- **Base de datos:** Neon (serverless, conectada vía connection string en variables de entorno)

---

## Arquitectura general

```
┌──────────────────────────────────────────────┐
│              CLIENTE (PWA)                   │
│                                              │
│  React + Vite                                │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐  │
│  │ Admin UI │ │Produccion  │ │Repartidor │  │
│  └────┬─────┘ └─────┬──────┘ └─────┬─────┘  │
│       │             │              │         │
│  ┌────▼─────────────▼──────────────▼──────┐  │
│  │     TanStack Query + Zustand           │  │
│  └────────────────────┬───────────────────┘  │
│                       │                      │
│  ┌────────────────────▼───────────────────┐  │
│  │     Service Worker + IndexedDB         │  │
│  └────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────┘
                        │ HTTPS (fetch)
┌───────────────────────▼──────────────────────┐
│           VERCEL EDGE FUNCTIONS              │
│                                              │
│  Hono Router                                 │
│  ┌─────────────┐  ┌────────────────────┐     │
│  │ better-auth │  │  API Routes        │     │
│  │ (JWT, sesión│  │  /api/pedidos      │     │
│  │  por rol)   │  │  /api/clientes     │     │
│  └──────┬──────┘  │  /api/productos    │     │
│         │         │  /api/produccion   │     │
│         │         └──────────┬─────────┘     │
└─────────┼────────────────────┼───────────────┘
          │                    │
┌─────────▼────────────────────▼───────────────┐
│                   NEON                       │
│           PostgreSQL Serverless              │
│                                              │
│  Drizzle ORM schema + migrations             │
└──────────────────────────────────────────────┘
```

---

## Estructura de carpetas

```
limpimax-app/
├── public/
│   ├── manifest.json
│   └── icons/
│
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/              # shadcn/ui generados
│   │   ├── common/          # Layout, Sidebar, Drawer, BadgeEstado, etc.
│   │   ├── pedidos/
│   │   ├── produccion/
│   │   └── repartidor/
│   │
│   ├── pages/
│   │   ├── admin/
│   │   ├── produccion/
│   │   └── repartidor/
│   │
│   ├── hooks/               # useAuth, usePedidos, useOffline, useSidebar
│   ├── store/               # Zustand stores
│   ├── lib/
│   │   ├── api.ts           # Fetch wrapper con auth headers
│   │   └── utils.ts
│   ├── services/            # Llamadas a la API por entidad
│   ├── types/               # TypeScript types + Zod schemas
│   └── sw.ts                # Service Worker (Workbox)
│
├── api/                     # Hono — Vercel Edge Functions
│   ├── index.ts             # Router principal
│   ├── auth.ts              # better-auth handlers
│   ├── pedidos.ts
│   ├── clientes.ts
│   ├── productos.ts
│   ├── produccion.ts
│   └── middleware/
│       └── auth.ts          # Verificar JWT + rol por ruta
│
├── db/
│   ├── schema.ts            # Drizzle schema (todas las tablas)
│   ├── migrations/          # Archivos de migración generados
│   └── index.ts             # Cliente Drizzle + conexión Neon
│
├── .env.local               # Variables locales (nunca al repo)
├── vercel.json              # Config Vercel (rewrites para la API)
├── vite.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
└── package.json
```

---

## Variables de entorno

```env
# Neon
DATABASE_URL=postgresql://[user]:[password]@[host]/[db]?sslmode=require

# better-auth
BETTER_AUTH_SECRET=[string aleatorio seguro, mínimo 32 chars]
BETTER_AUTH_URL=https://[tu-dominio].vercel.app

# Frontend (prefijo VITE_ para que Vite las exponga al cliente)
VITE_API_URL=https://[tu-dominio].vercel.app/api
```

---

## Dependencias principales

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@tanstack/react-query": "^5",
    "zustand": "^4",
    "react-hook-form": "^7",
    "zod": "^3",
    "tailwindcss": "^3",
    "hono": "^4",
    "better-auth": "^1",
    "drizzle-orm": "^0.30",
    "@neondatabase/serverless": "^0.9",
    "idb": "^8"
  },
  "devDependencies": {
    "vite": "^5",
    "vite-plugin-pwa": "^0.19",
    "workbox-window": "^7",
    "drizzle-kit": "^0.20",
    "vitest": "^1",
    "@types/react": "^18",
    "@types/react-dom": "^18"
  }
}
```

---

## Seguridad

- **Auth por API:** cada request a la API lleva el JWT en `Authorization: Bearer`. La capa `middleware/auth.ts` de Hono verifica el token y extrae el rol antes de ejecutar cualquier handler.
- **Autorización por rol en cada ruta:** el middleware verifica que el rol del usuario tenga permiso para la acción solicitada. No hay lógica de permisos en el frontend — solo ocultamiento visual.
- **No exponer datos sensibles por rol:** las queries de producción no devuelven precios. Las queries del repartidor no devuelven datos internos.
- **Variables de entorno:** nunca hardcodeadas en el código. `DATABASE_URL` y `BETTER_AUTH_SECRET` solo en el servidor (sin prefijo `VITE_`).

---

## Polling para sincronización en tiempo real

Sin Supabase Realtime, la sincronización entre roles se maneja con polling:
- **Dashboard Admin:** refresca cada 30 segundos (TanStack Query `refetchInterval`)
- **Vista Producción:** refresca cada 60 segundos
- **Vista Repartidor:** sin polling — el repartidor actúa sobre su lista descargada al inicio del día
- Si en el futuro se necesita tiempo real estricto, se agrega Server-Sent Events en Hono

---

## vercel.json

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" }
  ]
}
```

---

## Configuración PWA (vite.config.ts)

```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Limpimax',
        short_name: 'Limpimax',
        theme_color: '#0D5C8A',
        background_color: '#F4F6F8',
        display: 'standalone',
        orientation: 'portrait',
        icons: [/* 192x192 y 512x512 */]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [/* cache para llamadas a /api */]
      }
    })
  ]
}
```
