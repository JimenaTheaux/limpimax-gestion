// ─── Enums ───────────────────────────────────────────────────────────────────

export type EstadoPedido =
  | 'borrador'
  | 'confirmado'
  | 'en_produccion'
  | 'listo_reparto'
  | 'en_reparto'
  | 'entregado'
  | 'cerrado'
  | 'entrega_fallida'
  | 'anulado'

export type Rol = 'admin' | 'produccion' | 'repartidor' | 'superadmin'

export type TipoCliente = 'minorista' | 'mayorista'

export type TipoPrecio = 'minorista' | 'mayorista'

export type FormaCobro = 'efectivo' | 'transferencia' | 'pendiente'

// ─── Config de estados — valores exactos del design system ───────────────────

export const ESTADO_CONFIG: Record<EstadoPedido, { bg: string; color: string; label: string }> = {
  borrador:        { bg: '#F0F0F0', color: '#9A9A9A', label: 'BORRADOR' },
  confirmado:      { bg: '#E8F4FF', color: '#1B9ED6', label: 'CONFIRMADO' },
  en_produccion:   { bg: '#FFF3E0', color: '#F57C00', label: 'EN PRODUCCIÓN' },
  listo_reparto:   { bg: '#FFFDE7', color: '#F9A825', label: 'LISTO REPARTO' },
  en_reparto:      { bg: '#E3F2FD', color: '#1565C0', label: 'EN REPARTO' },
  entregado:       { bg: '#E8F8F0', color: '#2E9E5C', label: 'ENTREGADO' },
  cerrado:         { bg: '#D4EDDA', color: '#145A32', label: 'CERRADO' },
  entrega_fallida: { bg: '#FDECEA', color: '#D32F2F', label: 'ENTREGA FALLIDA' },
  anulado:         { bg: '#ECEFF1', color: '#455A64', label: 'ANULADO' },
}

// ─── Entidades ───────────────────────────────────────────────────────────────

export interface Perfil {
  id:        string
  userId:    string
  nombre:    string
  rol:       Rol
  activo:    boolean
  createdAt: string
}

export interface Cliente {
  id:          string
  nombre:      string
  cuit:        string | null
  telefono:    string | null
  direccion:   string | null
  tipocliente: TipoCliente
  notas:       string | null
  activo:      boolean
  createdAt:   string
  updatedAt:   string
}

export interface CategoriaProducto {
  id:     string
  nombre: string
}

export interface Producto {
  id:              string
  codigo:          string | null
  nombre:          string
  fragancia:       string | null
  categoriaId:     string | null
  unidadMedida:    string
  presentacion:    string
  precioMinorista: string
  precioMayorista: string
  activo:          boolean
  createdAt:       string
  updatedAt:       string
  categoria?:      CategoriaProducto
}

export interface PedidoItem {
  id:               string
  pedidoId:         string
  productoId:       string
  cantidad:         string
  precioUnitario:   string
  precioReferencia: string
  bidonNuevo:       boolean
  producto?:        Producto
}

export interface PedidoHistorial {
  id:             string
  pedidoId:       string
  estadoAnterior: EstadoPedido | null
  estadoNuevo:    EstadoPedido
  usuarioId:      string | null
  notas:          string | null
  createdAt:      string
  usuario?:       Perfil
}

export interface Pedido {
  id:               string
  numero:           number
  clienteId:        string
  tipoPrecio:       TipoPrecio
  direccionEntrega: string | null
  estado:           EstadoPedido
  fechaProduccion:  string | null
  notasInternas:    string | null
  notasProduccion:  string | null
  costoEnvio:       string
  totalCalculado:   string
  totalManual:      string | null
  formaCobro:       FormaCobro | null
  montoCobrado:     string | null
  notasEntrega:     string | null
  motivoFalla:      string | null
  motivoAnulacion:  string | null
  creadoPor:        string | null
  repartidorId:     string | null
  createdAt:        string
  updatedAt:        string
  // Relaciones opcionales (cuando se hace join)
  cliente?:         Cliente
  items?:           PedidoItem[]
  historial?:       PedidoHistorial[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatNumero = (n: number): string => `P-${String(n).padStart(5, '0')}`

export const totalPedido = (pedido: Pedido): string =>
  pedido.totalManual ?? pedido.totalCalculado
