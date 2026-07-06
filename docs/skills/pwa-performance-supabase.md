---
name: pwa-performance-supabase
description: Optimiza PWAs con Vite + React + Supabase + TanStack Query. Cubre navegación sin pantallas en blanco, token refresh proactivo, caché de queries, code splitting, skeletons y monitoreo de Core Web Vitals. Usar cuando hay lentitud al cambiar de página, acciones que no actualizan la UI, o token vencido que congela la app.
license: MIT
---

# PWA Performance — Vite + Supabase + TanStack Query

## Stack objetivo
React 18 + Vite + TypeScript + TanStack Query v5 + Supabase JS v2 + vite-plugin-pwa

---

## 1. QueryClient — configuración base

Extraer a `src/lib/queryClient.ts` (no crear en `main.tsx`
para poder importarlo desde `useAuth.ts` sin segunda instancia).

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 3,   // 3 min — no re-fetch si datos frescos
      gcTime:               1000 * 60 * 10,  // 10 min en memoria
      retry: (failureCount, error: any) => {
        // No reintentar errores de autenticación
        if (error?.status === 401 || error?.code === 'PGRST301') return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      refetchOnMount:       'stale',
      placeholderData:      (prev: unknown) => prev, // evita pantalla en blanco al navegar
    },
    mutations: {
      onError: (error: any) => {
        if (error?.status === 401 || error?.code === 'PGRST301') {
          supabase.auth.refreshSession().then(({ error: e }) => {
            if (e) window.location.href = '/login'
            else queryClient.invalidateQueries()
          })
        }
      }
    }
  }
})
```

---

## 2. Token refresh proactivo (visibilitychange)

El problema: en PWAs, el navegador throttlea los `setTimeout`
cuando la pestaña está oculta. Supabase usa `setTimeout` para
renovar el JWT antes de que expire (~1h). Si la pestaña estuvo
dormida más que el ciclo de refresh, el token vence y la primera
request sale con token vencido → se cuelga silenciosamente sin 401.

La solución: listener a nivel de módulo en `useAuth.ts`
(fuera de cualquier hook/efecto de React).

```typescript
// src/hooks/useAuth.ts — FUERA del hook, a nivel de módulo
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

let hiddenAt: number | null = null

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      hiddenAt = Date.now()
      return
    }

    const secondsHidden = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0
    hiddenAt = null

    if (secondsHidden > 60) {
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        await supabase.auth.signOut()
        window.location.href = '/login'
        return
      }
      queryClient.invalidateQueries()
    }
  })
}
```

---

## 3. Code splitting por rutas (Vite + React)

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

// Páginas con lazy — cada una carga solo cuando se navega a ella
const Dashboard      = lazy(() => import('./pages/admin/Dashboard'))
const PedidosPage    = lazy(() => import('./pages/admin/PedidosPage'))
const ClientesPage   = lazy(() => import('./pages/admin/ClientesPage'))
const ProductosPage  = lazy(() => import('./pages/admin/ProductosPage'))
const EgresosPage    = lazy(() => import('./pages/admin/EgresosPage'))
const ProduccionPage = lazy(() => import('./pages/produccion/ProduccionPage'))
const RepartidorPage = lazy(() => import('./pages/repartidor/RepartidorPage'))

// Fallback mínimo — fondo de la app sin spinner intrusivo
const PageShell = () => (
  <div style={{ minHeight: '100vh', background: '#F4F6F8' }} />
)

export function AppRoutes() {
  return (
    <Suspense fallback={<PageShell />}>
      <Routes>
        <Route path="/admin"       element={<Dashboard />} />
        <Route path="/pedidos"     element={<PedidosPage />} />
        <Route path="/clientes"    element={<ClientesPage />} />
        <Route path="/productos"   element={<ProductosPage />} />
        <Route path="/egresos"     element={<EgresosPage />} />
        <Route path="/produccion"  element={<ProduccionPage />} />
        <Route path="/reparto"     element={<RepartidorPage />} />
      </Routes>
    </Suspense>
  )
}
```

---

## 4. Chunk splitting en Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendors pesados en chunks separados
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':    ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui':       ['@radix-ui/react-dialog', /* otros radix */],
        }
      }
    }
  }
})
```

---

## 5. Skeleton loading — nunca pantalla en blanco

Regla: si `isLoading && !data` → skeleton. Si `isLoading && data` → mostrar datos viejos + barra de progreso arriba.

```typescript
// src/components/common/Skeleton.tsx
export function SkeletonTabla({ filas = 5 }: { filas?: number }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #D1D5DB', overflow: 'hidden' }}>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} style={{
          display: 'flex', gap: 16, padding: '12px 16px',
          borderBottom: i < filas - 1 ? '0.5px solid #F4F6F8' : 'none'
        }}>
          {[80, 160, 120, 80].map((w, j) => (
            <div key={j} style={{
              width: w, height: 14, borderRadius: 4,
              background: '#F4F6F8', animation: 'shimmer 1.2s infinite'
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <>
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 10,
          border: '0.5px solid #D1D5DB', padding: '12px 14px',
          marginBottom: 6, borderLeft: '3px solid #F4F6F8'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ width: 70, height: 12, borderRadius: 4, background: '#F4F6F8', animation: 'shimmer 1.2s infinite' }} />
            <div style={{ width: 60, height: 12, borderRadius: 4, background: '#F4F6F8', animation: 'shimmer 1.2s infinite' }} />
          </div>
          <div style={{ width: 140, height: 13, borderRadius: 4, background: '#F4F6F8', animation: 'shimmer 1.2s infinite', marginBottom: 6 }} />
          <div style={{ width: 100, height: 12, borderRadius: 4, background: '#F4F6F8', animation: 'shimmer 1.2s infinite' }} />
        </div>
      ))}
    </>
  )
}
```

CSS global en `index.css`:
```css
@keyframes shimmer {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.4 }
}
```

---

## 6. RefreshBar — indicador de re-fetch no bloqueante

```typescript
// src/components/common/RefreshBar.tsx
import { useIsFetching } from '@tanstack/react-query'

export function RefreshBar() {
  const isFetching = useIsFetching() > 0
  if (!isFetching) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 2, background: '#1B9ED6', zIndex: 9999,
      animation: 'progressBar 1s ease infinite',
      transformOrigin: 'left center'
    }} />
  )
}
```

CSS:
```css
@keyframes progressBar {
  0%   { transform: scaleX(0); opacity: 1 }
  70%  { transform: scaleX(0.8) }
  100% { transform: scaleX(1); opacity: 0 }
}
```

Montar UNA sola vez en el layout raíz (no en cada página).

---

## 7. Query keys centralizadas

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  pedidos: {
    all:        () => ['pedidos']                              as const,
    list:       (f: object) => ['pedidos', 'list', f]         as const,
    detail:     (id: string) => ['pedidos', 'detail', id]     as const,
    produccion: (fecha: string) => ['pedidos', 'prod', fecha] as const,
    repartidor: (fecha: string) => ['pedidos', 'rep', fecha]  as const,
    dashboard:  (d: string, h: string) => ['pedidos', 'dash', d, h] as const,
  },
  clientes:  { all: () => ['clientes'] as const },
  productos: { all: () => ['productos'] as const },
  egresos:   { all: (m: number, a: number) => ['egresos', m, a] as const },
}
```

Regla de invalidación — siempre quirúrgica:
```typescript
// MAL — invalida todo, re-fetch de toda la app
queryClient.invalidateQueries()

// BIEN — solo lo afectado
queryClient.invalidateQueries({ queryKey: queryKeys.pedidos.all() })
queryClient.invalidateQueries({ queryKey: queryKeys.clientes.all() })
```

---

## 8. Prefetch en hover (navegación instantánea)

```typescript
// En Navbar o links de navegación
import { useQueryClient } from '@tanstack/react-query'

function NavLink({ to, label, queryKey, queryFn }) {
  const queryClient = useQueryClient()

  return (
    <a
      href={to}
      onMouseEnter={() => queryClient.prefetchQuery({ queryKey, queryFn })}
      onTouchStart={() => queryClient.prefetchQuery({ queryKey, queryFn })}
    >
      {label}
    </a>
  )
}
```

---

## 9. Patrón completo de useQuery en páginas

```typescript
// Patrón correcto para toda página con lista
const { data, isLoading, isFetching } = useQuery({
  queryKey: queryKeys.pedidos.list(filtros),
  queryFn:  () => getPedidos(filtros),
  placeholderData: (prev) => prev, // mantiene datos al cambiar filtros
})

// En el JSX:
if (isLoading && !data) return <SkeletonTabla />   // primera carga
// si hay data (aunque vieja): mostrarla siempre
// isFetching && data → RefreshBar arriba (ya está montado globalmente)
```

---

## 10. Optimistic updates en mutaciones de estado

```typescript
const mutation = useMutation({
  mutationFn: ({ id, estado }) => cambiarEstado(id, estado),

  onMutate: async ({ id, estado }) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.pedidos.all() })
    const snapshot = queryClient.getQueryData(queryKeys.pedidos.list({}))

    // Actualizar UI antes de que confirme el servidor
    queryClient.setQueryData(queryKeys.pedidos.list({}), (old: Pedido[]) =>
      old?.map(p => p.id === id ? { ...p, estado } : p)
    )
    return { snapshot }
  },

  onError: (_err, _vars, ctx) => {
    // Revertir si falla
    queryClient.setQueryData(queryKeys.pedidos.list({}), ctx?.snapshot)
    showToast('error', 'No se pudo actualizar el estado')
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pedidos.all() })
  }
})
```

---

## 11. Core Web Vitals monitoring

```typescript
// src/lib/vitals.ts
export function initVitals() {
  if (typeof window === 'undefined') return

  // LCP
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`LCP: ${Math.round(entry.startTime)}ms`)
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true })

  // CLS
  new PerformanceObserver((list) => {
    let cls = 0
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) cls += (entry as any).value
    }
    if (cls > 0.1) console.warn(`CLS alto: ${cls.toFixed(3)}`)
  }).observe({ type: 'layout-shift', buffered: true })

  // INP (reemplazó FID en 2024)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const inp = (entry as any).processingEnd - (entry as any).processingStart
      if (inp > 200) console.warn(`INP alto: ${Math.round(inp)}ms`)
    }
  }).observe({ type: 'event', buffered: true })
}
```

Llamar en `main.tsx`:
```typescript
import { initVitals } from './lib/vitals'
if (import.meta.env.PROD) initVitals()
```

---

## 12. Checklist de aplicación por proyecto

```
SETUP:
[ ] QueryClient en src/lib/queryClient.ts (no en main.tsx)
[ ] visibilitychange listener en useAuth.ts (fuera del hook)
[ ] RefreshBar montado en el layout raíz
[ ] queryKeys.ts centralizado

BUILD:
[ ] lazy() en todas las rutas de App.tsx
[ ] manualChunks en vite.config.ts para vendors pesados

QUERIES:
[ ] placeholderData: (prev) => prev en todas las queries de listas
[ ] if (isLoading && !data) → skeleton (nunca null o div vacío)
[ ] invalidateQueries siempre con queryKey específico

MUTATIONS:
[ ] onSuccess invalida solo las queries afectadas
[ ] onError muestra toast de error (nunca falla silencioso)
[ ] Loading state en botones mientras procesa (disabled)

VERIFICACIÓN:
[ ] Navegar entre páginas → sin pantalla en blanco
[ ] Dejar app 2+ min en background → vuelve sin congelar
[ ] Confirmar acción → UI actualizada sin reload
[ ] Token vence → redirect a login, no pantalla rota
[ ] Chrome DevTools Network → chunks separados por ruta
```

---

## Targets de performance

| Métrica | Bueno   | Mejorar  |
|---------|---------|----------|
| LCP     | < 2.5s  | 2.5–4s   |
| INP     | < 200ms | 200–500ms|
| CLS     | < 0.1   | 0.1–0.25 |
| TTI     | < 3.8s  | 3.8–7.3s |

## Herramientas

- Chrome DevTools → Performance + Network tabs
- Lighthouse (en modo incógnito)
- `npx vite-bundle-visualizer` — ver tamaño de chunks
- Supabase Dashboard → API logs para detectar requests con token vencido

---

## 13. Service Worker agresivo (navigationPreload + StaleWhileRevalidate)

El Workbox por defecto cachea assets estáticos pero no las llamadas a Supabase.
Agregar `navigationPreload` y `StaleWhileRevalidate` para requests de API:

```typescript
// vite.config.ts — workbox section
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  navigationPreload: true,
  runtimeCaching: [
    {
      // Supabase REST API — StaleWhileRevalidate
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Supabase Auth — NetworkFirst (nunca cachear tokens viejos)
      urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'supabase-auth-cache' },
    },
  ],
}
```

Resultado: UI aparece con datos del cache mientras actualiza en background.
El usuario nunca ve pantalla en blanco al navegar.

---

## 14. Preconnect a Supabase en index.html

Elimina negociación DNS/TLS en la primera request. Agregar en `<head>`:

```html
<link rel="preconnect" href="https://[proyecto].supabase.co" crossorigin>
<link rel="dns-prefetch" href="https://[proyecto].supabase.co">
```

Reemplazar `[proyecto]` con el subdominio real del proyecto Supabase.
Impacto: ~100–300ms menos en Time To First Byte en carga inicial.

---

## 15. Fuente Inter autoalojada (eliminar bloqueo de Google Fonts)

Google Fonts bloquea el render hasta resolver el DNS externo.

```bash
# Descargar Inter desde fontsource
npm install @fontsource-variable/inter
```

```typescript
// src/main.tsx — reemplazar el <link> de Google Fonts
import '@fontsource-variable/inter'
```

```css
/* src/index.css */
body {
  font-family: 'Inter Variable', sans-serif;
  font-display: swap;
}
```

Eliminar el `<link>` de Google Fonts en `index.html`.
Impacto: elimina request externa bloqueante, mejora LCP ~200–400ms.

---

## 16. fetchpriority en recurso crítico (logo)

```html
<!-- En el navbar — el logo es el recurso visual más importante -->
<img
  src="/Logo_sin_fondo_negro.png"
  width="28"
  height="28"
  fetchpriority="high"
  loading="eager"
  alt="Burbuja"
/>

<!-- Imágenes no críticas (avatares, íconos secundarios) -->
<img loading="lazy" ... />
```

---

## 17. Suspense boundaries granulares por sección

Un solo Suspense global bloquea toda la página.
Dividir por zona — el header carga instantáneo, solo el contenido muestra skeleton:

```tsx
// src/pages/admin/PedidosPage.tsx
export default function PedidosPage() {
  return (
    <div>
      {/* Header: carga sin Suspense — es estático */}
      <PageHeader title="Pedidos" />

      {/* Tabla: tiene su propio Suspense */}
      <Suspense fallback={<SkeletonTabla />}>
        <TablaPedidos />
      </Suspense>

      {/* KPIs laterales: Suspense independiente */}
      <Suspense fallback={<SkeletonCard cantidad={2} />}>
        <ResumenEstados />
      </Suspense>
    </div>
  )
}
```

---

## 18. Virtual scrolling para listas largas

Si pedidos, productos o clientes superan 150 filas, usar `@tanstack/react-virtual`:

```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function TablaPedidosVirtual({ pedidos }: { pedidos: Pedido[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: pedidos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // altura estimada de cada fila en px
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              width: '100%',
            }}
          >
            <FilaPedido pedido={pedidos[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

Activar solo si `pedidos.length > 150` — para listas cortas añade complejidad sin beneficio.

---

## 19. Optimistic UI en cambios de estado (impacto mayor)

El cambio de estado percibido pasa de ~800ms a 0ms.
Implementar en TODAS las mutaciones de cambio de estado de pedido:

```typescript
// src/services/pedidos.ts
export function useCambiarEstado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, estado, usuarioId }: { id: string; estado: EstadoPedido; usuarioId: string }) =>
      supabase.rpc('cambiar_estado_pedido', {
        p_pedido_id: id,
        p_nuevo_estado: estado,
        p_usuario_id: usuarioId,
        p_notas: null,
      }),

    onMutate: async ({ id, estado }) => {
      // Cancelar queries en vuelo para evitar sobreescribir el optimistic update
      await queryClient.cancelQueries({ queryKey: ['pedidos'] })

      // Snapshot para revertir si falla
      const snapshot = queryClient.getQueryData(['pedidos'])

      // Actualizar UI inmediatamente sin esperar al servidor
      queryClient.setQueryData(['pedidos'], (old: Pedido[] | undefined) =>
        old?.map(p => p.id === id ? { ...p, estado } : p) ?? []
      )

      return { snapshot }
    },

    onError: (_err, _vars, ctx) => {
      // Revertir al estado anterior
      if (ctx?.snapshot) {
        queryClient.setQueryData(['pedidos'], ctx.snapshot)
      }
    },

    onSettled: () => {
      // Confirmar con el servidor siempre
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}
```

---

## Checklist extendido (agregar al checklist del punto 12)

```
SERVICE WORKER:
[ ] navigationPreload activado en workbox
[ ] StaleWhileRevalidate para /rest/v1/*
[ ] NetworkFirst para /auth/*

CARGA INICIAL:
[ ] preconnect + dns-prefetch a Supabase en index.html
[ ] Inter autoalojada via @fontsource-variable/inter
[ ] fetchpriority="high" en logo del navbar
[ ] Sin <link> de Google Fonts en index.html

RENDERING:
[ ] Suspense boundaries por sección, no solo global
[ ] Virtual scrolling activado si lista > 150 items

MUTATIONS:
[ ] useCambiarEstado con optimistic update
[ ] onMutate → cancelQueries + setQueryData inmediato
[ ] onError → revertir snapshot
[ ] onSettled → invalidateQueries para confirmar
```
