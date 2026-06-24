# 07 — Guía de Desarrollo Iterativo

## Filosofía
Lanzar simple, lanzar rápido. El MVP debe funcionar y ser usado. Cada decisión técnica prioriza velocidad de entrega y facilidad de mantenimiento.

---

## Orden de desarrollo

### FASE 1 — Setup del proyecto
```bash
npm create vite@latest limpimax-app -- --template react-ts
cd limpimax-app
```

1. Instalar y configurar Tailwind CSS + shadcn/ui
2. Instalar dependencias principales (ver 05_stack_tecnico.md)
3. Crear proyecto en Neon, obtener `DATABASE_URL`
4. Configurar `db/schema.ts` con el schema de `06_estructura_de_datos.md`
5. Ejecutar `npx drizzle-kit push` — verificar que las tablas se crean sin errores
6. Configurar `api/index.ts` con Hono + rutas básicas
7. Configurar better-auth para email+password
8. Configurar `vite-plugin-pwa` con manifest básico
9. **Commit:** `feat: project setup`

### FASE 2 — Autenticación y routing
1. Pantalla de login (email + contraseña, float labels, estilo referencia)
2. Hook `useAuth` que consume la API de better-auth
3. Routing protegido por rol (React Router v6 + guard components)
4. Layout base con sidebar colapsable (Admin) y topbar (Producción/Repartidor)
5. Bottom nav para mobile
6. Probar login con 3 usuarios de prueba antes de avanzar
7. **Commit:** `feat: auth and role routing`

### FASE 3 — ABM base
1. ABM de Clientes (lista + drawer crear/editar)
2. ABM de Productos (lista + drawer crear/editar)
3. Gestión de Usuarios básica
4. Probar creación de datos antes de avanzar
5. **Commit:** `feat: clients and products ABM`

### FASE 4 — Módulo de pedidos (Admin)
1. Formulario crear pedido en drawer lateral
2. Lista de pedidos con filtros y badges de estado
3. Detalle de pedido en drawer + historial de estados
4. Editar pedido + alerta de precio desactualizado
5. Anular pedido con motivo
6. Probar flujo completo: crear → ver → editar → anular
7. **Commit:** `feat: orders module`

### FASE 5 — Flujo de estados
1. Vista de Producción (kanban desktop + lista agrupada mobile)
2. Lista resumen de producción descargable
3. Vista del Repartidor (cards + detalle expandible)
4. Avance de emergencia del repartidor
5. Registro de entrega y entrega fallida en drawers
6. Dashboard Admin con KPIs y tablero de estados
7. Probar el flujo completo de punta a punta con datos reales
8. **Commit:** `feat: full order flow`

### FASE 6 — Documentos y cobros
1. Documento por pedido (PDF/imprimible)
2. Listado del día para repartidor
3. Seguimiento de cobros en dashboard
4. Edición de cobro en pedidos cerrados
5. **Commit:** `feat: documents and billing`

### FASE 7 — Offline y PWA
1. Configurar Service Worker con Workbox
2. Persistencia en IndexedDB para el Repartidor (via `idb`)
3. Cola de sincronización offline
4. Probar en dispositivo Android real con modo avión
5. **Commit:** `feat: offline support`

### FASE 8 — Polish y deploy
1. Íconos PWA definitivos
2. Revisión de UX en celular Android real
3. Deploy en Vercel + variables de entorno en el dashboard de Vercel
4. **Commit:** `feat: branding and deploy`

---

## Git

### Estructura de ramas
```
main    → producción
dev     → desarrollo activo
feat/X  → funcionalidades nuevas
fix/X   → correcciones
```

### Flujo diario
```bash
git checkout dev && git pull
git checkout -b feat/vista-produccion
# trabajar...
git add . && git commit -m "feat: production view kanban + grouped list"
git checkout dev && git merge feat/vista-produccion && git push
```

### Convención de commits
```
feat:     nueva funcionalidad
fix:      corrección de bug
refactor: mejora sin cambio funcional
style:    cambios de UI/CSS
docs:     documentación
```

### .gitignore mínimo obligatorio
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

---

## Testing manual — checklist por fase

### Auth
- [ ] Login con cada rol redirige a la vista correcta
- [ ] Usuario sin sesión no accede a rutas protegidas
- [ ] Logout funciona desde cualquier vista

### Pedidos
- [ ] Cliente mayorista → precarga precio mayorista
- [ ] Cliente minorista → precarga precio minorista
- [ ] Total se recalcula al agregar/quitar ítems
- [ ] Total editado manualmente no se sobreescribe al agregar ítem
- [ ] Costo de envío suma al total
- [ ] Guardar como BORRADOR no envía a producción
- [ ] Confirmar pedido pasa a EN PRODUCCIÓN
- [ ] Marca de bidón nuevo se guarda y se muestra correctamente

### Flujo de estados
- [ ] Producción ve todos los pedidos EN PRODUCCIÓN (no solo hoy)
- [ ] Producción puede filtrar por fecha
- [ ] Repartidor solo ve pedidos del día
- [ ] Repartidor no ve precios de costo
- [ ] Avance de emergencia queda en historial
- [ ] Pedido CERRADO no puede anularse

### Datos
- [ ] Cambiar precio en ABM no modifica pedidos existentes
- [ ] Cambiar dirección de cliente conserva dirección original en pedidos anteriores

### UI/UX
- [ ] Sidebar se colapsa y el contenido ocupa toda la pantalla
- [ ] Drawers se abren correctamente en desktop (50%) y mobile (100%)
- [ ] Float labels funcionan en todos los inputs
- [ ] Indicador offline visible en vista repartidor
- [ ] Botones tienen mínimo 44px de altura en mobile

---

## Prompts tipo para Claude en VSCode

### Nueva funcionalidad
```
Proyecto: Limpimax App — PWA gestión de pedidos (empresa limpieza argentina).
Stack: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Hono + Drizzle + Neon.
Archivos de contexto: [adjuntar los .md relevantes]

Necesito implementar: [FUNCIONALIDAD]
Comportamiento: [descripción del punto en 04_funcionalidades_por_modulo.md]

ESTILO OBLIGATORIO:
- Cards: border-radius 20px, fondo blanco, sombra sutil
- Inputs: float label (placeholder sube al hacer focus/valid)
- Botón primary: bg #0D5C8A, border-radius 10px, mín 44px altura
- Drawer lateral para formularios: 50% desktop, 100% mobile, fondo oscurecido
- Sidebar: colapsable, 240px abierta / 64px cerrada (solo íconos)
- Dot decorativo animado (pulse) en títulos de secciones activas
- Mobile-first siempre
```

### Debug
```
Componente: [pegar código]
Problema: [descripción]
Comportamiento esperado: [citar requisito de 04_funcionalidades_por_modulo.md]
```

### Query de base de datos
```
Necesito la query Drizzle para: [caso de uso]
Schema en 06_estructura_de_datos.md.
Rol del usuario: [rol] con estas restricciones: [describir]
```

---

## Buenas prácticas

### Código
- Funciones pequeñas y con un solo propósito
- Nombres descriptivos en español está bien para este proyecto
- No optimizar prematuramente
- Borrar código muerto — Git lo recuerda
- Un componente por archivo

### API (Hono)
- Validar el body de cada request con Zod antes de tocar la base de datos
- Nunca devolver más datos de los que el rol necesita
- Manejar errores con respuestas JSON consistentes: `{ error: string, code: string }`

### Base de datos (Drizzle + Neon)
- No hacer múltiples queries donde alcanza un join
- Usar transacciones cuando se actualizan múltiples tablas en un mismo request (ej: cambio de estado + insertar historial)
- Correr `npx drizzle-kit studio` para explorar los datos durante desarrollo

### UI/UX
- Mobile-first: diseñar para pantalla chica, escalar a desktop
- Botones de acción mínimo 44px de alto
- Estados de carga explícitos (spinner o skeleton)
- Mensajes de error en lenguaje simple, en español
- Confirmación antes de acciones destructivas (anular, avance de emergencia)
- Drawers para formularios — nunca páginas nuevas para crear/editar

---

## Checklist antes de lanzar el MVP

- [ ] Flujo completo probado con usuarios reales (no el dev)
- [ ] Probado en celular Android real con Chrome
- [ ] Sin errores de consola en producción
- [ ] Variables de entorno cargadas en Vercel (no en el código)
- [ ] Al menos 3 usuarios creados (uno por rol)
- [ ] Datos iniciales cargados: productos del catálogo, clientes existentes
- [ ] Modo offline probado con modo avión en el celular del repartidor
- [ ] Sidebar colapsable probada en desktop y mobile
- [ ] Todos los drawers funcionan en mobile (100% ancho, scroll interno)

---

## Checklist de pendientes para arrancar

- [ ] Logo en PNG (mínimo 512×512px) para íconos PWA
- [ ] URL definitiva de deploy (para configurar better-auth redirect)
- [ ] Lista de usuarios iniciales: nombre, email, rol
- [ ] Catálogo inicial de productos para seed
- [ ] Lista de clientes existentes para migrar

---

## PRÓXIMAS FUNCIONALIDADES (post-MVP v1)

### Módulo de Egresos (prioridad alta)

Registrar salidas de dinero de la empresa para tener un balance real de ingresos vs egresos en el dashboard.

**Campos mínimos necesarios:**
- `fecha_egreso DATE`
- `concepto TEXT` (descripción del gasto)
- `monto NUMERIC(10,2)`
- `categoria TEXT` (ej: insumos, logística, sueldos, servicios)
- `registrado_por UUID → perfiles`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

**Impacto en dashboard:**
- Nueva KPI: "Egresos del período"
- Nueva KPI: "Balance" (cobrado - egresos)
- Gráfico de evolución actualizado con línea de egresos
- Nueva sección en dashboard: lista de egresos del período

**SQL a preparar:**
```sql
CREATE TABLE egresos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_egreso  DATE NOT NULL,
  concepto      TEXT NOT NULL,
  monto         NUMERIC(10,2) NOT NULL,
  categoria     TEXT,
  registrado_por UUID REFERENCES perfiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**Scope:**
- Solo Admin puede ver y registrar egresos.
- Form: drawer simple con fecha, concepto, monto, categoría.
- No bloquea el MVP actual — se agrega como módulo nuevo.
- El filtro de fecha en el dashboard (desde/hasta) aplica a egresos por `fecha_egreso`.

### Limitación conocida a resolver: historial offline

Los cambios de estado tomados sin conexión (modo offline del repartidor) no escriben en `pedido_historial`. La sincronización actualiza `pedidos.estado` directamente sin pasar por la RPC `cambiar_estado_pedido`. Para resolver: exponer un endpoint REST que reciba el batch de acciones offline y ejecute las RPCs correctas con los timestamps originales.
