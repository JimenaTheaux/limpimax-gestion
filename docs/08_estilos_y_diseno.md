# 08 — Estilos y Diseño (Design System MVP)

## Fuente única de verdad visual
Este archivo se adjunta en CADA prompt a Claude. No inventar estilos fuera de este documento.

---

# PRINCIPIOS DE DISEÑO

- UI **operativa, no decorativa** — foco en datos y acciones
- **Mobile-first siempre** — diseñar para celular, escalar a desktop
- Jerarquía clara: estado → datos clave → acciones
- Estética moderna y limpia — sin gradientes decorativos, sin sombras pesadas
- **Foco total en el formulario/drawer activo** — el resto queda oscurecido

---

# TOKENS DE DISEÑO

## Colores (tailwind.config.ts)

```typescript
colors: {
  primary:     '#0D5C8A',   // azul profundo — marca, botones principales
  accent:      '#1B9ED6',   // azul agua — focus, links, acciones secundarias
  surface:     '#F4F6F8',   // fondo general de la app
  card:        '#FFFFFF',   // fondo de cards (blanco puro)
  sidebar:     '#1A2B3C',   // sidebar y texto oscuro
  muted:       '#4A5568',   // texto secundario
  border:      '#D1D5DB',   // bordes suaves
  error:       '#D32F2F',
  'error-bg':  '#FDECEA',
  success:     '#2E9E5C',
  'success-bg':'#E8F8F0',
  warning:     '#F9A825',
  'warning-bg':'#FFFDE7',
}
```

## Estados de pedido — valores exactos e inmutables

| Estado | bg (pill/badge) | color (texto) |
|---|---|---|
| BORRADOR | `#F0F0F0` | `#9A9A9A` |
| CONFIRMADO | `#E8F4FF` | `#1B9ED6` |
| EN_PRODUCCION | `#FFF3E0` | `#F57C00` |
| LISTO_REPARTO | `#FFFDE7` | `#F9A825` |
| EN_REPARTO | `#E3F2FD` | `#1565C0` |
| ENTREGADO | `#E8F8F0` | `#2E9E5C` |
| CERRADO | `#D4EDDA` | `#145A32` |
| ENTREGA_FALLIDA | `#FDECEA` | `#D32F2F` |
| ANULADO | `#ECEFF1` | `#455A64` |

**Regla:** usar inline styles para estos colores. No crear clases Tailwind para estados.
**Regla:** nunca depender solo del color — siempre acompañar con texto del estado.

---

# TIPOGRAFÍA

Fuente: **Inter** (Google Fonts). Una sola fuente en todo el proyecto.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
```

| Uso | CSS |
|---|---|
| Título principal | `font-size: 28px; font-weight: 900; letter-spacing: -1px` |
| Subtítulo | `font-size: 18px; font-weight: 700` |
| Texto base | `font-size: 14px; font-weight: 400` |
| Texto secundario | `font-size: 14px; color: rgba(88,87,87,0.82)` |
| Label | `font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em` |
| Micro / badge | `font-size: 9px; font-weight: 700` |

---

# COMPONENTES

## Cards

```css
.card {
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  /* Sin border en reposo — la sombra sutil define el borde */
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  transition: box-shadow 0.2s ease;
}
```

Tailwind equivalente:
```
bg-white rounded-[20px] p-5 shadow-sm hover:shadow-md transition-shadow
```

## Cards con borde de estado (pedidos)

```tsx
// Borde lateral izquierdo con color del estado
<div
  className="bg-white rounded-[20px] p-4 shadow-sm hover:shadow-md transition-shadow"
  style={{ borderLeft: `4px solid ${colorDelEstado}` }}
>
```

## Badge de estado

```tsx
<span
  style={{
    backgroundColor: estadoConfig[estado].bg,
    color: estadoConfig[estado].color,
    fontSize: '9px',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: '99px',
    display: 'inline-block',
  }}
>
  {estadoConfig[estado].label}
</span>
```

## Inputs con float label

```css
.form-label {
  position: relative;
}

.form-label .input {
  width: 100%;
  padding: 10px 10px 20px 10px;
  outline: 0;
  border: 1px solid rgba(105, 105, 105, 0.4);
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-label .input:focus {
  border-color: #1B9ED6;
}

.form-label .input:valid {
  border-color: #2E9E5C;
}

.form-label span {
  position: absolute;
  left: 10px;
  top: 15px;
  color: rgba(88,87,87,0.82);
  font-size: 14px;
  cursor: text;
  transition: all 0.2s ease;
  pointer-events: none;
}

.form-label .input:focus + span,
.form-label .input:not(:placeholder-shown) + span {
  top: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #1B9ED6;
}

.form-label .input:valid + span {
  color: #2E9E5C;
}
```

## Botones

```css
/* Primary */
.btn-primary {
  background: #0D5C8A;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 12px 20px;
  min-height: 44px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}
.btn-primary:hover { background: #0a4f7a; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Secondary */
.btn-secondary {
  background: transparent;
  color: #0D5C8A;
  border: 1.5px solid #0D5C8A;
  border-radius: 10px;
  padding: 12px 20px;
  min-height: 44px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-secondary:hover { background: rgba(13,92,138,0.06); }

/* Destructivo */
.btn-danger {
  background: #FDECEA;
  color: #D32F2F;
  border: 1.5px solid #D32F2F;
  border-radius: 10px;
  padding: 12px 20px;
  min-height: 44px;
  font-size: 15px;
  font-weight: 600;
}
.btn-danger:hover { background: #fcd9d6; }
```

## Formularios

```css
.form-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #ffffff;
  padding: 24px;
  border-radius: 20px;
  position: relative;
}
```

## Dot decorativo animado (títulos activos)

```css
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #0D5C8A;
  display: flex;
  align-items: center;
  padding-left: 26px;
  position: relative;
}

.section-title::before {
  position: absolute;
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  left: 0;
  background: #0D5C8A;
}

.section-title::after {
  position: absolute;
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  left: 0;
  background: #0D5C8A;
  animation: pulse 1.2s ease-out infinite;
}

@keyframes pulse {
  0%   { transform: scale(0.9); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}
```

---

# LAYOUT

## Navbar (Admin — top horizontal)

```
Fondo:      #1A2B3C
Altura:     52px
Padding:    0 20px
Posición:   sticky, top 0, z-index 50
```

```tsx
// Layout principal — columna, sin margin-left
<div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
  <Navbar onLogout={handleLogout} />
  <div style={{ flex: 1, overflowY: 'auto' }}>
    <Outlet />
  </div>
</div>
```

- Brand: logo mark 28px `border-radius: 7px` background `#1B9ED6` (o `/logo-mark.png`) + "Limpimax" `font-size 13px, font-weight 500, color #fff`, `margin-right: 32px`
- Nav links: `Dashboard · Pedidos · Clientes · Productos · Egresos · Usuarios` — ícono Tabler 15px + texto, `padding: 6px 12px, border-radius: 7px, font-size: 12px, color: rgba(255,255,255,0.55)`
- Item activo: `background: #0D5C8A, color: #ffffff, font-weight: 500`
- Hover: `color: rgba(255,255,255,0.9), background: rgba(255,255,255,0.09), transition 0.15s ease` + underline `#1B9ED6` 2px que aparece con `opacity 0 → 1`
- Right side (`margin-left: auto`): avatar circular 26px `background #0D5C8A` + iniciales, nombre `font-size 11px color rgba(255,255,255,0.6)`, botón logout `rgba(255,255,255,0.4)` (hover `rgba(255,255,255,0.85)`)
- Mobile (<768px): se ocultan los labels de los links y del brand/usuario, quedan solo los íconos — sin bottom nav para Admin

## Bottom nav (mobile — todos los roles)

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #ffffff;
  border-top: 1px solid #D1D5DB;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}
```

4 ítems máximo. Ícono + label en `font-size: 10px`. Ítem activo en `color: #0D5C8A`.

## Topbar

```css
.topbar {
  height: 56px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #D1D5DB;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 50;
}
```

## Drawer / Sheet lateral (formularios)

```css
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 50%;          /* Desktop */
  width: 100%;         /* Mobile — usar media query */
  background: #F4F6F8;
  z-index: 201;
  overflow-y: auto;
  padding: 24px;
  animation: slideIn 0.25s ease;
}

@media (max-width: 768px) {
  .drawer { width: 100%; }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

**Regla:** todos los formularios de crear/editar (pedidos, clientes, productos, usuarios) se abren en este drawer. Nunca páginas nuevas para formularios.

## Área de contenido principal

```css
.main-content {
  min-height: 100vh;
  background: #F4F6F8;
  padding: 24px 16px;
  padding-bottom: 72px; /* espacio para bottom nav en mobile */
}

@media (min-width: 768px) {
  .main-content {
    padding: 32px;
    padding-bottom: 32px;
  }
}
```

---

# PATRONES POR ROL

## Admin — decisión y control
- Navbar horizontal superior, en desktop y mobile (sin bottom nav)
- KPIs grandes arriba (mínimo 4)
- Tablero de pedidos agrupados por estado
- Todos los formularios en drawers laterales
- Puede usar densidad alta de información

## Producción — ejecución
- Sin sidebar — topbar simple con toggle de fecha
- **Desktop:** kanban horizontal, una columna por día de producción
- **Mobile:** lista agrupada por fecha con encabezado separador
- Panel resumen (totales por producto) colapsable arriba
- Sin precios ni totales en ningún lado
- Botón "Marcar listo" prominente (mínimo 48px, full-width en mobile)

## Repartidor — acción rápida
- Sin sidebar — topbar con indicador de conexión
- Cards grandes, una por pedido, scroll vertical
- Info esencial: cliente, dirección, total a cobrar (número grande)
- Botones de acción muy grandes (mínimo 48px)
- Máximo 2 acciones visibles por pedido
- Indicador de conexión y banner de sync siempre visibles

---

# UX RULES

- Tap targets mínimo **44px** de altura en mobile (48px en botones de acción principales)
- Máximo **2 acciones principales** por vista operativa
- **Feedback inmediato** en toda interacción: hover, active, loading
- **Estados vacíos obligatorios:** mensaje + ícono cuando una lista está vacía
- **Confirmación** antes de acciones destructivas o irreversibles (modal simple, no alert del browser)
- **Indicador de conexión** siempre visible para el rol Repartidor
- Errores en **lenguaje simple:** "No se pudo guardar el pedido, intentá de nuevo."
- **Float labels** en todos los inputs de formulario
- **Drawers** para todos los formularios — no páginas nuevas

---

# ANTI-PATTERNS — nunca hacer esto

- No usar `window.alert()` o `window.confirm()` — siempre componentes de UI
- No abrir formularios en páginas nuevas — siempre drawers
- No saturar con colores fuera de la paleta definida
- No mezclar estilos de cards en la misma vista
- No usar más de una fuente
- No inventar colores de estado — usar la tabla exacta
- No poner más de 4 acciones en una misma card
- No usar sidebar en mobile — siempre bottom nav
- No mostrar precios a Producción
- No mostrar precios de costo al Repartidor (solo total a cobrar)

---

# NAMING DE COMPONENTES

| Componente | Nombre |
|---|---|
| Badge de estado | `BadgeEstado` |
| Card de pedido | `CardPedido` |
| Card KPI | `CardKPI` |
| Drawer/Sheet lateral | `Drawer` |
| Navbar superior (Admin) | `Navbar` |
| Input con float label | `FloatInput` |
| Dot animado | `PulseDot` |
| Botón primary | `BtnPrimary` |
| Layout admin | `AdminLayout` |
| Layout producción | `ProduccionLayout` |
| Layout repartidor | `RepartidorLayout` |
| Bottom nav mobile | `BottomNav` |
| Panel kanban producción | `KanbanProduccion` |
| Lista agrupada producción | `ListaProduccion` |

**Regla:** si un elemento se repite 2 veces → crear componente reutilizable.
