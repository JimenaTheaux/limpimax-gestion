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
- **Campos obligatorios al cerrar:**
  - `forma_cobro`: efectivo / transferencia / pendiente
  - `monto_cobrado`: numérico (obligatorio si forma ≠ pendiente)
  - `estado_pago`: cobrado | pendiente (se deriva automáticamente de forma_cobro)
- **Acciones disponibles:** Admin puede editar cobro (forma_cobro, monto_cobrado, estado_pago, fecha_cobro).
- **No se puede anular ni retroceder.**
- **Visible para:** Administración.

#### Relación `fecha_cobro` / `estado_pago`

| forma_cobro | estado_pago | fecha_cobro |
|---|---|---|
| efectivo / transferencia | cobrado | fecha seleccionada al cerrar |
| pendiente | pendiente | null |

- `fecha_cobro` = fecha en que ingresó el dinero (no la fecha del pedido ni la de producción).
- Los KPIs de cobros en el dashboard filtran por `fecha_cobro`, no por `fecha_produccion`.
  - Un pedido producido el 5/6 puede tener `fecha_cobro = 8/6` si cobró días después.
  - Pedidos con `estado_pago = 'pendiente'` tienen `fecha_cobro = null` y no aparecen en los KPIs de cobros hasta que se registre el cobro.
- Al editar cobro en un pedido cerrado, `estado_pago` se recalcula automáticamente desde `forma_cobro`.

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
