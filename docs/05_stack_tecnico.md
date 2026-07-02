# 05 — Stack Técnico y Arquitectura

> Este documento refleja el stack **real** del proyecto tal como está implementado (no el plan original). El plan inicial contemplaba un backend propio con Neon + Drizzle + Hono + better-auth; en la práctica el proyecto se construyó 100% sobre **Supabase** (DB + Auth + RPC), sin backend custom. Ver nota al final.

## Decisiones tecnológicas

### Frontend
- **Framework:** React 19 + Vite 8 (TypeScript)
- **Tipo de app:** PWA (Progressive Web App)
  - Instalable en Android desde Chrome
  - Soporte offline con Service Worker (Workbox) + cola de sincronización propia
  - Manifest con íconos e identidad visual (`vite-plugin-pwa`)
- **Estilos:** Tailwind CSS v3
- **Componentes UI:** shadcn/ui sobre Radix UI primitives (`avatar`, `badge`, `button`, `card`, `dialog`, `input`, `label`, `separator`, `sheet`, `skeleton`, `toast`) + `class-variance-authority` + `tailwind-merge` + `clsx`
- **Routing:** React Router v6
- **Estado global:** Zustand (solo `authStore` — perfil/sesión del usuario)
- **Data fetching / cache de servidor:** TanStack Query v5
- **Formularios:** React Hook Form + Zod v4 (`@hookform/resolvers`)
- **Offline:** `idb` (IndexedDB) para cola de acciones pendientes + Workbox para cache de assets/API
- **Íconos:** lucide-react y @tabler/icons-react
- **Gráficos (dashboard):** Chart.js
- **Generación de comprobantes/facturas imprimibles:** html2canvas
- **Exportación Excel:** SheetJS (`xlsx`) — usado en la tabla de detalle de bidones del dashboard

### Backend / Base de datos
- **Todo en Supabase** — no hay backend propio (sin Hono, sin servidor Node en producción):
  - **Base de datos:** PostgreSQL administrado por Supabase
  - **Auth:** Supabase Auth (email + password), con tabla `perfiles` extendiendo `auth.users` para guardar `nombre`, `rol` y `activo`
  - **Acceso a datos:** el frontend llama directamente a Supabase vía `@supabase/supabase-js` (sin capa de API intermedia)
  - **Lógica atómica:** funciones RPC en PL/pgSQL (`SECURITY DEFINER`) para operaciones que deben ser una sola transacción — ej. `cambiar_estado_pedido` (actualiza `pedidos` + inserta en `pedido_historial` en un solo round-trip). Ver `supabase/rpcs_and_indexes.sql`
  - **Autorización:** Row Level Security (RLS) por rol en Postgres — ver `06_estructura_de_datos.md`

**Por qué Supabase puro (sin backend propio):**
- Un solo proveedor para DB + Auth + Storage, menos piezas que mantener para un equipo chico
- `supabase-js` con RLS reemplaza la necesidad de una capa de API custom para validar permisos
- Las RPC en Postgres cubren los pocos casos que necesitan atomicidad multi-tabla, sin levantar un servidor

### Deploy
- **Frontend:** Vercel — SPA estática (`vite build` → `dist/`), `vercel.json` solo reescribe todo a `index.html` (no hay funciones serverless en producción)
- **Base de datos / Auth:** Supabase (proyecto cloud, conectado vía `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)

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
│  │   TanStack Query + Zustand (authStore) │  │
│  └────────────────────┬───────────────────┘  │
│                       │                      │
│  ┌────────────────────▼───────────────────┐  │
│  │  Service Worker (Workbox) + idb        │  │
│  │  (cola offline de acciones pendientes) │  │
│  └────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────┘
                        │ HTTPS (@supabase/supabase-js)
┌───────────────────────▼──────────────────────┐
│                   SUPABASE                   │
│                                              │
│  ┌─────────────┐  ┌────────────────────┐     │
│  │ Supabase    │  │  PostgreSQL        │     │
│  │ Auth (JWT)  │  │  + RLS por rol     │     │
│  └──────┬──────┘  │  + RPC (PL/pgSQL)  │     │
│         │         └──────────┬─────────┘     │
└─────────┼────────────────────┼───────────────┘
          │                    │
   tabla `perfiles`     pedidos, clientes, productos,
   (rol, activo)        pedido_items, pedido_historial, egresos
```

No hay capa de API propia: cada `service` en `src/services/*` llama directamente a `supabase.from(...)` / `supabase.rpc(...)`, y RLS en Postgres es la única barrera de autorización real (el filtrado por rol en el frontend es solo para UX).

---

## Estructura de carpetas (real)

```
limpimax-gestion/
├── public/
│   ├── manifest.json (generado por vite-plugin-pwa)
│   └── icons/
│
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/              # shadcn/ui sobre Radix (button, dialog, sheet, toast, etc.)
│   │   ├── common/          # AdminLayout, ProduccionLayout, RepartidorLayout,
│   │   │                    # Navbar, BottomNav, Drawer, BadgeEstado, ProtectedRoute, etc.
│   │   └── pedidos/         # DrawerPedido, DrawerDetalle, FacturaCanvas
│   │
│   ├── pages/
│   │   ├── admin/           # Dashboard, Pedidos, Clientes, Productos, Usuarios, Egresos
│   │   ├── produccion/      # Produccion, Listos
│   │   ├── repartidor/      # Repartidor, Historial
│   │   ├── print/           # Facturas, ListadoDia, PrintPedido
│   │   ├── LoginPage.tsx
│   │   └── PerfilPage.tsx
│   │
│   ├── hooks/                # useAuth, useOffline, useToast, useDebounce, useScrollDirection, useCompartirFactura, useCompartirSaldoPendiente
│   ├── store/                 # authStore.ts (Zustand)
│   ├── lib/
│   │   ├── supabase.ts       # Cliente Supabase
│   │   ├── queryClient.ts    # QueryClient configurado (staleTime, retry, onError 401, manejo de auth)
│   │   ├── offlineQueue.ts   # Cola de acciones offline (idb)
│   │   └── utils.ts
│   ├── services/             # Llamadas a Supabase por entidad (pedidos, clientes, productos, usuarios, produccion, egresos)
│   └── types/                # Tipos TS (Pedido, Cliente, Producto, Rol, EstadoPedido, etc.)
│
├── supabase/
│   └── rpcs_and_indexes.sql  # RPCs PL/pgSQL + índices (se ejecuta a mano en el SQL Editor de Supabase)
│
├── .env.local                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (nunca al repo)
├── vercel.json                 # Rewrite SPA (sin funciones serverless)
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Variables de entorno

```env
# Supabase
VITE_SUPABASE_URL=https://[proyecto].supabase.co
VITE_SUPABASE_ANON_KEY=[anon key]
```

No hay variables de servidor: todo corre en el cliente con la `anon key` + RLS.

---

## Dependencias principales (`package.json` real)

```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^6",
    "@tanstack/react-query": "^5",
    "zustand": "^4",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^5",
    "zod": "^4",
    "@supabase/supabase-js": "^2",
    "@radix-ui/react-avatar": "^1",
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-label": "^2",
    "@radix-ui/react-separator": "^1",
    "@radix-ui/react-slot": "^1",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^3",
    "lucide-react": "^1",
    "@tabler/icons-react": "^3",
    "chart.js": "^4",
    "html2canvas": "^1",
    "idb": "^8",
    "workbox-window": "^7"
  },
  "devDependencies": {
    "vite": "^8",
    "vite-plugin-pwa": "^1",
    "typescript": "~6",
    "tailwindcss": "^3",
    "@vitejs/plugin-react": "^6",
    "eslint": "^10",
    "typescript-eslint": "^8"
  }
}
```

> Nota: `package.json` conserva scripts `db:push` / `db:studio` (drizzle-kit) y un `server.ts` que arranca una app Hono en `./api/_app`. Son residuos del plan original — **`drizzle-kit` no está instalado y la carpeta `api/` no existe en el repo**. Estos archivos/scripts son código muerto, no forman parte del stack en uso.

---

## Seguridad

- **Auth:** Supabase Auth (JWT en sesión, manejado por `@supabase/supabase-js`, persistido en `localStorage`).
- **Autorización real por rol:** Row Level Security (RLS) en Postgres — ver políticas en `06_estructura_de_datos.md`. El frontend (`ProtectedRoute`, ocultamiento de menús) es solo UX; la barrera real de seguridad está en RLS.
- **Perfil y rol:** tabla `perfiles` (1:1 con `auth.users`), con columna `activo` — un usuario desactivado pierde acceso aunque su sesión siga viva (`useAuth` cierra sesión si `activo = false`).
- **No exponer datos sensibles por rol:** las políticas RLS de `pedidos` limitan qué filas puede ver cada rol (producción solo ve `en_produccion`/`listo_reparto`; repartidor solo pedidos del día).
- **Variables de entorno:** `VITE_SUPABASE_ANON_KEY` es pública por diseño (Supabase está pensado para esto); la seguridad depende de RLS, no de ocultar la key.
- **Refresh proactivo del token:** `useAuth` registra un listener `visibilitychange` a nivel módulo. Cuando la pestaña vuelve a estar visible después de ≥ 60 segundos oculta, llama a `supabase.auth.refreshSession()`. Si el refresh falla → redirect a `/login`. Si tiene éxito → invalida todas las queries de TanStack Query para refrescar datos.
- **Manejo de errores 401 en QueryClient:** `src/lib/queryClient.ts` configura un `onError` global en mutations (y retry=false en queries) para los códigos `401` y `PGRST301`. Al detectarlos intenta `refreshSession`; si falla, redirige a `/login`.
- **Cache del perfil:** `useAuth` persiste el perfil en `localStorage` (clave `limpimax-perfil-v2`) para evitar parpadeo al recargar. El perfil en cache se usa como valor inmediato; una actualización silenciosa en background sincroniza el estado real desde Supabase.

---

## Sincronización entre roles

No hay WebSockets ni Supabase Realtime en uso: cada vista hace fetch/refetch con TanStack Query al entrar o tras una acción. La vista del repartidor depende de la lista descargada al inicio del día y de la cola offline (`useOffline` + `offlineQueue.ts`, basada en `idb`) para seguir operando sin conexión y sincronizar al reconectar.

> Limitación conocida: las acciones sincronizadas desde la cola offline actualizan `pedidos` directamente (no pasan por la RPC `cambiar_estado_pedido`), por lo que no generan registro en `pedido_historial`. Ver `07_guia_desarrollo_iterativo.md`.

---

## vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Configuración PWA (vite.config.ts)

```typescript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  devOptions: { enabled: true },
  manifest: {
    name: 'Limpimax App',
    short_name: 'Limpimax',
    theme_color: '#0D5C8A',
    background_color: '#F4F6F8',
    display: 'standalone',
    orientation: 'portrait',
    icons: [/* 192x192, 512x512, apple-touch-icon */],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-cache', expiration: { maxEntries: 100, maxAgeSeconds: 300 } },
      },
    ],
  },
})
```

---

## Nota: por qué este documento difiere del plan original

El plan inicial del proyecto proponía Neon (Postgres serverless) + Drizzle ORM + Hono (API en Vercel Edge Functions) + better-auth, con el frontend como un consumidor de una API propia. Durante el desarrollo se simplificó a **Supabase end-to-end** (DB + Auth + RLS + RPC), eliminando la necesidad de mantener un backend separado. Quedaron como residuos sin uso: `server.ts`, los scripts `db:push`/`db:studio` en `package.json`, y las referencias a Hono/Drizzle/Neon/better-auth en `07_guia_desarrollo_iterativo.md` (corregidas en ese documento).
