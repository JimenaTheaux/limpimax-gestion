# 03 — Flujo de Estados del Pedido

## Ciclo de vida

```
[BORRADOR] ──► [CONFIRMADO] ──► [EN PRODUCCIÓN] ──► [LISTO PARA REPARTO] ──► [EN REPARTO] ──► [ENTREGADO] ──► [CERRADO]
                                       │                                                              │
                                       │ (emergencia: repartidor)                                     └──► [ENTREGA FALLIDA]
                                       └─────────────────────────────────────────────────────────────►┘
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
- **Acciones:** Marcar "Entregado" o "Entrega fallida" (Repartidor o Admin).
- **Visible para:** Admin, Repartidor.

### `ENTREGADO`
- **Quién lo establece:** Repartidor al confirmar la entrega.
- **Campos que se completan:** forma de cobro, monto cobrado, observaciones.
- **Acciones:** Admin puede cerrarlo.
- **Visible para:** Admin, Repartidor (solo lectura).

### `CERRADO`
- **Quién lo establece:** Administración.
- **Qué significa:** Venta completamente cerrada y verificada.
- **Acciones:** Solo editar forma de pago y monto cobrado (correcciones). No se puede anular ni retroceder.
- **Visible para:** Administración.

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
| ENTREGADO | `#E8F8F0` | `#2E9E5C` |
| CERRADO | `#D4EDDA` | `#145A32` |
| ENTREGA_FALLIDA | `#FDECEA` | `#D32F2F` |
| ANULADO | `#ECEFF1` | `#455A64` |

**Regla:** usar SIEMPRE estos valores exactos con inline styles. No inventar variantes.
**Regla:** nunca depender solo del color — siempre acompañar con texto del estado.
Badge: `font-size: 9px, font-weight: 700, padding: 2px 7px, border-radius: 99px`
