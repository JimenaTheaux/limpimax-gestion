# 01 — Contexto y Visión del Proyecto

## Nombre del proyecto
> **LIMPIMAX Productos Químicos — Limpimax App**

## Descripción general
Sistema interno de gestión de pedidos para una empresa de fabricación y distribución de productos de limpieza. PWA centralizada que permite registrar, seguir y cerrar pedidos en tiempo real, desde el alta hasta el cobro.

Reemplaza el flujo manual actual: cuadernos → foto → WhatsApp → otro cuaderno.

## Problema que resuelve
- Doble y triple registro de la misma información entre áreas
- Pérdida de información entre Administración, Producción y Reparto
- Imposibilidad de ver el estado real de un pedido en cualquier momento
- Cierres de venta sin trazabilidad ni registro centralizado

## Objetivo del MVP
Digitalizar el ciclo de vida completo de un pedido, desde su registro inicial hasta el cobro y cierre, con visibilidad diferenciada por rol y estado siempre accesible para todos los usuarios autorizados.

## Alcance del MVP

### Incluido
- Registro de pedidos con productos, cantidades y precios snapshot
- Flujo de estados: Alta → Producción → En reparto → Cerrado
- Roles diferenciados: Administración, Producción, Repartidor
- Panel de control para Administración con vista global y KPIs de ventas
- Cierre de venta con registro de forma de pago (efectivo / transferencia)
- Funcionalidad offline básica para el Repartidor
- Listado resumen de fabricación (total de cada producto a fabricar y envasar)
- Generación de documento por pedido (tipo factura para el cliente)
- Generación de listado con clientes y totales (para el repartidor)
- ABM de productos y clientes (solo Administración)
- Marca de bidón nuevo por ítem de pedido

### Fuera del alcance
- Gestión de stock de materias primas
- Facturación electrónica / integración AFIP
- Contabilidad o reportes financieros avanzados
- Integración con sistemas externos
- App móvil nativa (es PWA instalable desde Chrome)
- Notificaciones push (se agrega post-MVP)

## Usuarios del sistema

| Rol | Dispositivo principal | Contexto de uso |
|---|---|---|
| Administración | Celular Android / notebook | Oficina, siempre con conexión |
| Producción | Celular Android | Planta, siempre con conexión |
| Repartidor | Celular Android | En ruta, puede quedar sin señal |

## Identidad visual

| Token | HEX | Uso |
|---|---|---|
| primary | `#0D5C8A` | Azul profundo — marca, botones principales |
| accent | `#1B9ED6` | Azul agua — focus, links, acciones secundarias |
| surface | `#F4F6F8` | Gris neutro — fondo general de la app |
| card | `#FFFFFF` | Fondo de cards |
| sidebar | `#1A2B3C` | Sidebar y texto oscuro |
| muted | `#4A5568` | Texto secundario |
| border | `#D1D5DB` | Bordes suaves |
| error | `#D32F2F` | Errores y estados destructivos |
| success | `#2E9E5C` | Confirmaciones y estados exitosos |
| warning | `#F9A825` | Alertas y estados de atención |

**Tipografía:** Inter (principal) desde Google Fonts

## Visión a futuro (post-MVP)
- Gestión de stock de insumos y materias primas
- Múltiples repartidores con zonas asignadas
- Reportes de ventas y rendimiento
- Integración con WhatsApp para notificaciones automáticas
- Facturación electrónica (integración AFIP)
- Notificaciones push (Web Push API)
