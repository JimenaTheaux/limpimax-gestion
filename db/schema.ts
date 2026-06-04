import {
  pgTable, pgEnum, uuid, text, boolean, timestamp,
  numeric, serial, date, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enum ────────────────────────────────────────────────────────────────────

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

// ─── Tablas ──────────────────────────────────────────────────────────────────

export const perfiles = pgTable('perfiles', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    text('user_id').notNull().unique(),
  nombre:    text('nombre').notNull(),
  rol:       text('rol', { enum: ['admin', 'produccion', 'repartidor', 'superadmin'] }).notNull(),
  activo:    boolean('activo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const clientes = pgTable('clientes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  nombre:      text('nombre').notNull(),
  cuit:        text('cuit'),              // CUIT/CUIL sin guiones, ej: 20304050609
  telefono:    text('telefono'),
  direccion:   text('direccion'),
  tipocliente: text('tipo_cliente', { enum: ['minorista', 'mayorista'] }).notNull().default('minorista'),
  notas:       text('notas'),
  activo:      boolean('activo').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
})

export const categoriasProducto = pgTable('categorias_producto', {
  id:     uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull().unique(),
})

export const productos = pgTable('productos', {
  id:              uuid('id').primaryKey().defaultRandom(),
  codigo:          text('codigo').unique(),
  nombre:          text('nombre').notNull(),
  fragancia:       text('fragancia'),
  categoriaId:     uuid('categoria_id').references(() => categoriasProducto.id),
  unidadMedida:    text('unidad_medida').default('litros'),
  presentacion:    numeric('presentacion', { precision: 5, scale: 1 }).notNull(),
  precioMinorista: numeric('precio_minorista', { precision: 10, scale: 2 }).notNull().default('0'),
  precioMayorista: numeric('precio_mayorista', { precision: 10, scale: 2 }).notNull().default('0'),
  activo:          boolean('activo').default(true),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
})

export const pedidos = pgTable('pedidos', {
  id:               uuid('id').primaryKey().defaultRandom(),
  numero:           serial('numero'),
  clienteId:        uuid('cliente_id').notNull().references(() => clientes.id),
  tipoPrecio:       text('tipo_precio', { enum: ['minorista', 'mayorista'] }).notNull(),
  direccionEntrega: text('direccion_entrega'),
  estado:           estadoPedidoEnum('estado').notNull().default('borrador'),
  fechaProduccion:  date('fecha_produccion'),
  notasInternas:    text('notas_internas'),
  notasProduccion:  text('notas_produccion'),
  costoEnvio:       numeric('costo_envio', { precision: 10, scale: 2 }).default('0'),
  totalCalculado:   numeric('total_calculado', { precision: 10, scale: 2 }).default('0'),
  totalManual:      numeric('total_manual', { precision: 10, scale: 2 }),
  formaCobro:       text('forma_cobro', { enum: ['efectivo', 'transferencia', 'pendiente'] }),
  montoCobrado:     numeric('monto_cobrado', { precision: 10, scale: 2 }),
  notasEntrega:     text('notas_entrega'),
  motivoFalla:      text('motivo_falla'),
  motivoAnulacion:  text('motivo_anulacion'),
  creadoPor:        uuid('creado_por').references(() => perfiles.id),
  repartidorId:     uuid('repartidor_id').references(() => perfiles.id),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
}, (t) => [
  index('idx_pedidos_estado').on(t.estado),
  index('idx_pedidos_fecha_produccion').on(t.fechaProduccion),
  index('idx_pedidos_cliente').on(t.clienteId),
  index('idx_pedidos_created_at').on(t.createdAt),
])

export const pedidoItems = pgTable('pedido_items', {
  id:               uuid('id').primaryKey().defaultRandom(),
  pedidoId:         uuid('pedido_id').notNull().references(() => pedidos.id, { onDelete: 'cascade' }),
  productoId:       uuid('producto_id').notNull().references(() => productos.id),
  cantidad:         numeric('cantidad', { precision: 10, scale: 3 }).notNull(),
  precioUnitario:   numeric('precio_unitario', { precision: 10, scale: 2 }).notNull(),
  precioReferencia: numeric('precio_referencia', { precision: 10, scale: 2 }).notNull(),
  bidonNuevo:       boolean('bidon_nuevo').default(false),
})

export const pedidoHistorial = pgTable('pedido_historial', {
  id:             uuid('id').primaryKey().defaultRandom(),
  pedidoId:       uuid('pedido_id').notNull().references(() => pedidos.id, { onDelete: 'cascade' }),
  estadoAnterior: estadoPedidoEnum('estado_anterior'),
  estadoNuevo:    estadoPedidoEnum('estado_nuevo').notNull(),
  usuarioId:      uuid('usuario_id').references(() => perfiles.id),
  notas:          text('notas'),
  createdAt:      timestamp('created_at').defaultNow(),
})

// ─── Relaciones ──────────────────────────────────────────────────────────────

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  cliente:    one(clientes,  { fields: [pedidos.clienteId],   references: [clientes.id] }),
  creadoPor:  one(perfiles,  { fields: [pedidos.creadoPor],   references: [perfiles.id] }),
  repartidor: one(perfiles,  { fields: [pedidos.repartidorId], references: [perfiles.id] }),
  items:      many(pedidoItems),
  historial:  many(pedidoHistorial),
}))

export const pedidoItemsRelations = relations(pedidoItems, ({ one }) => ({
  pedido:   one(pedidos,   { fields: [pedidoItems.pedidoId],   references: [pedidos.id] }),
  producto: one(productos, { fields: [pedidoItems.productoId], references: [productos.id] }),
}))

export const pedidoHistorialRelations = relations(pedidoHistorial, ({ one }) => ({
  pedido:  one(pedidos,  { fields: [pedidoHistorial.pedidoId],  references: [pedidos.id] }),
  usuario: one(perfiles, { fields: [pedidoHistorial.usuarioId], references: [perfiles.id] }),
}))

export const clientesRelations = relations(clientes, ({ many }) => ({
  pedidos: many(pedidos),
}))

export const productosRelations = relations(productos, ({ one, many }) => ({
  categoria: one(categoriasProducto, { fields: [productos.categoriaId], references: [categoriasProducto.id] }),
  items:     many(pedidoItems),
}))

export const perfilesRelations = relations(perfiles, ({ many }) => ({
  pedidosCreados:     many(pedidos),
  pedidosRepartidos:  many(pedidos),
}))
