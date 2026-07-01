# 03 — Flujo de Estados del Pedido

## Ciclo de vida

```
[BORRADOR] ──► [CONFIRMADO] ──► [EN PRODUCCIÓN] ──► [LISTO PARA REPARTO] ──► [EN REPARTO] ──► [CERRADO]
                                       │                                              │
                                       │ (emergencia: repartidor)                     └──► [ENTREGA FALLIDA]
                                       └──────────────────────────────────────────────────────────────────►┘

ENTREGA FALLIDA ──► LISTO PARA REPARTO (reagendado por Admin)
                    │
               [ANULADO] (desde cualquier estado excepto CERRADO, solo Admin)
```

Cada transición registra: estado anterior, estado nuevo, usuario, timestamp.

---

## Descripción de cada estado

### `BORRADOR`
- **Quién lo crea:** Administración
- **Qué significa:** Pedido iniciado, puede estar incompleto.
- **Acciones:** Editar, confirmar, anular.
- **Visible para:** Solo Administración.

### `CONFIRMADO`
- **Quién lo establece:** Administración al completar el pedido.
- **Qué significa:** Pedido completo, listo para producción.
- **Acciones:** Enviar a producción, editar, anular (Admin).
- **Visible para:** Administración.

### `EN PRODUCCIÓN`
- **Quién lo establece:** Administración (al confirmar, pasa automáticamente).
- **Qué significa:** Producción está fabricando o armando el pedido.
- **Acciones:**
  - Marcar "Listo para reparto" (Producción o Admin)
  - Avance de emergencia a "En reparto" (Repartidor)
- **Visible para:** Admin (todos los días), Producción (todos los días, con filtro), Repartidor (solo hoy, lectura + emergencia).

### `LISTO PARA REPARTO`
- **Quién lo establece:** Producción o Admin.
- **Qué significa:** Pedido armado, esperando al repartidor.
- **Acciones:** Repartidor lo toma y marca como "En reparto".
- **Visible para:** Admin, Producción (solo lectura), Repartidor.

### `EN REPARTO`
- **Quién lo establece:** Repartidor, Admin, o por avance de emergencia.
- **Qué significa:** Pedido en camino al cliente.
- **Acciones:** Cerrar pedido con registro de cobro, o registrar entrega fallida (Repartidor o Admin).
- **Visible para:** Admin, Repartidor.

### `CERRADO`
- **Quién lo establece:** Repartidor (al confirmar entrega) o Administración.
- **Qué significa:** Pedido entregado y cobro registrado. Estado final de entrega.
- **Registro de pagos al cerrar:**
  - Se insertan N filas en `pedido_pagos` (una por forma de pago; puede ser combinado efectivo + transferencia)
  - `estado_pago`: `cobrado` si `SUM(pedido_pagos.monto) >= total_pedido`; `pendiente` si queda diferencia > 0
  - `fecha_cobro`: fecha en que ingresó el dinero (null si todos los pagos son pendientes)
  - Al cerrar se recalcula y actualiza `clientes.saldo_pendiente = total_pedido - SUM(pedido_pagos.monto)`
- **Acciones disponibles:** Admin puede editar cobro (agregar/modificar filas en `pedido_pagos`, `estado_pago`, `fecha_cobro`).
- **No se puede anular ni retroceder.**
- **Visible para:** Administración.
- **Campos deprecated en `pedidos`** (backward compat, no usar en lógica nueva): `forma_cobro`, `monto_cobrado`.

#### Relación `fecha_cobro` / `estado_pago`

| pagos registrados | estado_pago | fecha_cobro |
|---|---|---|
| SUM(pagos) >= total | cobrado | fecha seleccionada al cerrar |
| SUM(pagos) < total (pago parcial) | pendiente | fecha del pago (si hubo alguno) |
| sin pagos / todos pendientes | pendiente | null |

- `fecha_cobro` = fecha en que ingresó el dinero (no la fecha del pedido ni la de producción).
- Los KPIs de cobros en el dashboard filtran por `fecha_cobro`, no por `fecha_produccion`.
  - Un pedido producido el 5/6 puede tener `fecha_cobro = 8/6` si cobró días después.
  - Pedidos con `estado_pago = 'pendiente'` tienen `fecha_cobro = null` y no aparecen en los KPIs de cobros hasta que se registre el cobro.
- `clientes.saldo_pendiente` se actualiza en cada cierre: valor positivo = el cliente quedó debiendo; negativo = pagó de más (crédito a favor que descuenta del siguiente pedido).

### `ENTREGA FALLIDA`
- **Quién lo establece:** Repartidor.
- **Qué significa:** No se pudo entregar. No es estado final.
- **Campos:** Motivo (texto libre).
- **Acciones:** Admin puede re-enviarlo a "Listo para reparto" para reagendar.
- **Visible para:** Admin, Repartidor.

### `ANULADO`
- **Quién lo establece:** Solo Administración.
- **Desde qué estados:** Cualquiera excepto CERRADO.
- **Campos:** Motivo de anulación.
- **Nota:** Queda en historial pero no aparece en vistas operativas.

---

## Reglas del flujo

1. Los estados avanzan en orden. No se puede saltar estados excepto override Admin o emergencia Repartidor.
2. Solo Admin puede retroceder un pedido de estado (excepto Entrega Fallida que vuelve a Listo Para Reparto).
3. Cada cambio de estado registra: estado anterior, estado nuevo, usuario, timestamp.
4. El Repartidor ve pedidos del día actual solamente.
5. Un pedido CERRADO solo permite editar campos de cobro. No puede anularse ni retroceder.

---

## Colores por estado (UI)

| Estado | bg (fondo pill/badge) | color (texto/dot) |
|---|---|---|
| BORRADOR | `#F0F0F0` | `#9A9A9A` |
| CONFIRMADO | `#E8F4FF` | `#1B9ED6` |
| EN_PRODUCCION | `#FFF3E0` | `#F57C00` |
| LISTO_REPARTO | `#FFFDE7` | `#F9A825` |
| EN_REPARTO | `#E3F2FD` | `#1565C0` |
| CERRADO | `#D4EDDA` | `#145A32` |
| ENTREGA_FALLIDA | `#FDECEA` | `#D32F2F` |
| ANULADO | `#ECEFF1` | `#455A64` |

**Regla:** usar SIEMPRE estos valores exactos con inline styles. No inventar variantes.
**Regla:** nunca depender solo del color — siempre acompañar con texto del estado.
Badge: `font-size: 9px, font-weight: 700, padding: 2px 7px, border-radius: 99px`
