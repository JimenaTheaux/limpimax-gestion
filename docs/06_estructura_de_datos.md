# 06 — Estructura de Base de Datos (Neon + Drizzle ORM)

## Schema principal (db/schema.ts)

El schema se define en Drizzle y se aplica a Neon vía `drizzle-kit push` o migraciones.

---

### Tabla: `perfiles`
Extiende la tabla de usuarios de better-auth con datos del negocio.

```typescript
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const perfiles = pgTable('perfiles', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    text('user_id').notNull().unique(), // referencia al id de better-auth
  nombre:    text('nombre').notNull(),
  rol:       text('rol', { enum: ['admin', 'produccion', 'repartidor', 'superadmin'] }).notNull(),
  activo:    boolean('activo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

### Tabla: `clientes`

```typescript
export const clientes = pgTable('clientes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  nombre:      text('nombre').notNull(),
  telefono:    text('telefono'),
  direccion:   text('direccion'),         // Dirección única de entrega, editable
  tipocliente: text('tipo_cliente', { enum: ['minorista', 'mayorista'] }).notNull().default('minorista'),
  notas:       text('notas'),
  activo:      boolean('activo').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
})
```

---

### Tabla: `categorias_producto`

```typescript
export const categoriasProducto = pgTable('categorias_producto', {
  id:     uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull().unique(),
})
```

---

### Tabla: `productos`

```typescript
import { numeric } from 'drizzle-orm/pg-core'

export const productos = pgTable('productos', {
  id:              uuid('id').primaryKey().defaultRandom(),
  codigo:          text('codigo').unique(),
  nombre:          text('nombre').notNull(),
  fragancia:       text('fragancia'),
  categoriaId:     uuid('categoria_id').references(() => categoriasProducto.id),
  unidadMedida:    text('unidad_medida').default('litros'),
  // Presentación: 0.5, 3, 5, 10, 20 litros
  presentacion:    numeric('presentacion', { precision: 5, scale: 1 }).notNull(),
  precioMinorista: numeric('precio_minorista', { precision: 10, scale: 2 }).notNull().default('0'),
  precioMayorista: numeric('precio_mayorista', { precision: 10, scale: 2 }).notNull().default('0'),
  activo:          boolean('activo').default(true),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
})
```

---

### Enum: `estado_pedido`

```typescript
import { pgEnum } from 'drizzle-orm/pg-core'

export const estadoPedidoEnum = pgEnum('estado_pedido', [
  'borrador',
  'confirmado',
  'en_produccion',
  'listo_reparto',
  'en_reparto',
  'entregado',
  'cerrado',
  'entrega_fallida',
  'anulado',
])
```

---

### Tabla: `pedidos`

```typescript
import { serial, date } from 'drizzle-orm/pg-core'

export const pedidos = pgTable('pedidos', {
  id:               uuid('id').primaryKey().defaultRandom(),
  numero:           serial('numero'),                     // P-00001, P-00002...
  clienteId:        uuid('cliente_id').notNull().references(() => clientes.id),
  tipoPrecio:       text('tipo_precio', { enum: ['minorista', 'mayorista'] }).notNull(),
  direccionEntrega: text('direccion_entrega'),            // Snapshot de dirección al crear
  estado:           estadoPedidoEnum('estado').notNull().default('borrador'),
  fechaProduccion:  date('fecha_produccion'),             // Fecha programada de producción
  notasInternas:    text('notas_internas'),               // Solo Admin
  notasProduccion:  text('notas_produccion'),             // Admin + Producción
  costoEnvio:       numeric('costo_envio', { precision: 10, scale: 2 }).default('0'),
  totalCalculado:   numeric('total_calculado', { precision: 10, scale: 2 }).default('0'),
  totalManual:      numeric('total_manual', { precision: 10, scale: 2 }), // Si Admin sobreescribe
  // total a mostrar = totalManual ?? totalCalculado
  formaCobro:       text('forma_cobro', { enum: ['efectivo', 'transferencia', 'pendiente'] }),
  montoCobrado:     numeric('monto_cobrado', { precision: 10, scale: 2 }),
  notasEntrega:     text('notas_entrega'),                // Observaciones del repartidor
  motivoFalla:      text('motivo_falla'),
  motivoAnulacion:  text('motivo_anulacion'),
  creadoPor:        uuid('creado_por').references(() => perfiles.id),
  repartidorId:     uuid('repartidor_id').references(() => perfiles.id),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
})
```

---

### Tabla: `pedido_items`

```typescript
export const pedidoItems = pgTable('pedido_items', {
  id:              uuid('id').primaryKey().defaultRandom(),
  pedidoId:        uuid('pedido_id').notNull().references(() => pedidos.id, { onDelete: 'cascade' }),
  productoId:      uuid('producto_id').notNull().references(() => productos.id),
  cantidad:        numeric('cantidad', { precision: 10, scale: 3 }).notNull(),
  // Precio snapshot: se copia al crear y nunca cambia
  precioUnitario:  numeric('precio_unitario', { precision: 10, scale: 2 }).notNull(),
  // Precio del catálogo al momento de creación (para comparar al editar)
  precioReferencia: numeric('precio_referencia', { precision: 10, scale: 2 }).notNull(),
  bidonNuevo:      boolean('bidon_nuevo').default(false),
  // subtotal se calcula en la app: cantidad * precioUnitario
})
```

> **Nota `precioReferencia`:** al editar el pedido, si el precio actual del producto en el ABM difiere de `precioReferencia`, el sistema muestra alerta por ítem. El admin elige mantener el original (`precioUnitario`) o actualizar.

---

### Tabla: `pedido_historial`

```typescript
export const pedidoHistorial = pgTable('pedido_historial', {
  id:             uuid('id').primaryKey().defaultRandom(),
  pedidoId:       uuid('pedido_id').notNull().references(() => pedidos.id, { onDelete: 'cascade' }),
  estadoAnterior: estadoPedidoEnum('estado_anterior'),
  estadoNuevo:    estadoPedidoEnum('estado_nuevo').notNull(),
  usuarioId:      uuid('usuario_id').references(() => perfiles.id),
  notas:          text('notas'),
  createdAt:      timestamp('created_at').defaultNow(),
})
```

---

## Relaciones (para joins con Drizzle)

```typescript
import { relations } from 'drizzle-orm'

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  cliente:   one(clientes, { fields: [pedidos.clienteId], references: [clientes.id] }),
  creadoPor: one(perfiles, { fields: [pedidos.creadoPor], references: [perfiles.id] }),
  items:     many(pedidoItems),
  historial: many(pedidoHistorial),
}))

export const pedidoItemsRelations = relations(pedidoItems, ({ one }) => ({
  pedido:   one(pedidos, { fields: [pedidoItems.pedidoId], references: [pedidos.id] }),
  producto: one(productos, { fields: [pedidoItems.productoId], references: [productos.id] }),
}))
```

---

## Índices recomendados (en schema.ts)

```typescript
import { index } from 'drizzle-orm/pg-core'

// En la definición de pedidos agregar:
export const pedidosIndexes = {
  estadoIdx:          index('idx_pedidos_estado').on(pedidos.estado),
  fechaProduccionIdx: index('idx_pedidos_fecha_produccion').on(pedidos.fechaProduccion),
  clienteIdx:         index('idx_pedidos_cliente').on(pedidos.clienteId),
  createdAtIdx:       index('idx_pedidos_created_at').on(pedidos.createdAt),
}
```

---

## Queries de API por rol (lógica de filtrado en el servidor)

```typescript
// Producción — todos los pedidos EN PRODUCCIÓN, todos los días
const pedidosProduccion = await db
  .select()
  .from(pedidos)
  .where(eq(pedidos.estado, 'en_produccion'))
  .orderBy(asc(pedidos.fechaProduccion), asc(pedidos.createdAt))

// Producción — filtrar por fecha específica (opcional desde el cliente)
const pedidosPorFecha = await db
  .select()
  .from(pedidos)
  .where(
    and(
      eq(pedidos.estado, 'en_produccion'),
      eq(pedidos.fechaProduccion, fechaSeleccionada)
    )
  )

// Repartidor — solo pedidos del día actual, estados relevantes
const pedidosRepartidor = await db
  .select()
  .from(pedidos)
  .where(
    and(
      inArray(pedidos.estado, ['en_produccion', 'listo_reparto', 'en_reparto']),
      eq(pedidos.fechaProduccion, hoy)
    )
  )
  .orderBy(asc(pedidos.numero))

// Lista resumen producción — agrupar por producto y fecha
const resumenProduccion = await db
  .select({
    productoId:    pedidoItems.productoId,
    nombreProducto: productos.nombre,
    presentacion:  productos.presentacion,
    fechaProduccion: pedidos.fechaProduccion,
    totalCantidad: sql<number>`sum(${pedidoItems.cantidad})`,
    totalBidonNuevo: sql<number>`sum(case when ${pedidoItems.bidonNuevo} then ${pedidoItems.cantidad} else 0 end)`,
  })
  .from(pedidoItems)
  .innerJoin(pedidos, eq(pedidoItems.pedidoId, pedidos.id))
  .innerJoin(productos, eq(pedidoItems.productoId, productos.id))
  .where(eq(pedidos.estado, 'en_produccion'))
  .groupBy(pedidoItems.productoId, productos.nombre, productos.presentacion, pedidos.fechaProduccion)
  .orderBy(asc(pedidos.fechaProduccion), asc(productos.nombre))
```

---

## Formato de número de pedido

El campo `numero` es un SERIAL. En la UI se muestra formateado:

```typescript
const formatNumero = (n: number): string => `P-${String(n).padStart(5, '0')}`
// Ejemplo: 41 → "P-00041"
```

---

## drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:    './db/schema.ts',
  out:       './db/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

## Comandos Drizzle

```bash
# Generar migración desde el schema
npx drizzle-kit generate

# Aplicar migraciones a Neon
npx drizzle-kit migrate

# Push directo al schema (desarrollo rápido, sin migration files)
npx drizzle-kit push

# Abrir Drizzle Studio (UI para ver los datos)
npx drizzle-kit studio
```
