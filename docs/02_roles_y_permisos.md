# 02 — Roles y Permisos

## Roles del sistema

3 roles operativos + 1 superusuario de sistema.

---

### ROL: Administración (`admin`)
**Quién:** Personal de oficina que gestiona pedidos, clientes y cierre de ventas.

**Puede:**
- Crear, editar y anular pedidos
- Ver todos los pedidos en cualquier estado
- Acceder al dashboard general (resumen de estados, pedidos del día, pendientes)
- Acceder al dashboard de ventas con KPIs (cantidad, ingresos, filtros de fechas)
- Registrar y editar clientes
- ABM de productos y precios
- Avanzar el estado de cualquier pedido manualmente (override)
- Ver y registrar el cierre de ventas (cobro)
- Editar forma de pago y monto cobrado en pedidos CERRADOS
- Exportar o imprimir el listado de pedidos del día para producción
- Crear y gestionar usuarios del sistema

**Vista principal:** Dashboard con KPIs + tablero de pedidos agrupados por estado + dashboard de ventas.

---

### ROL: Producción (`produccion`)
**Quién:** Operario que fabrica y arma los pedidos.

**Puede:**
- Ver y descargar la lista de producción total (agrupada por artículo con cantidad total)
- **Ver pedidos EN PRODUCCIÓN filtrados por fecha seleccionada, navegando día a día. Vista principal: hoy.**
- Navegar a días anteriores o futuros con el selector de fecha (‹ / › / Hoy)
- Marcar pedidos como "Listo para reparto" en cualquier fecha (puede completar pedidos pendientes de días anteriores)
- Ver el detalle de cada pedido: cliente, productos, cantidades, notas de producción, marca bidón nuevo
- Ver pedidos ya marcados como listos (solo lectura)

**No puede:**
- Crear ni editar pedidos
- Ver información de precios ni totales de venta
- Modificar clientes ni productos
- Acceder al dashboard de administración

**Vista principal:**
- **Desktop:** Kanban horizontal — una columna para la fecha seleccionada, con scroll horizontal. Hoy destacado visualmente.
- **Mobile:** Lista agrupada por fecha con encabezado de día separador ("Hoy — Lun 2 jun · 3 pedidos" + línea divisora) y pedidos en cards debajo.
- Selector de fecha (‹ Lun 23 jun ›) en el header — navega día a día, botón "Hoy" cuando no es hoy.
- Banner informativo cuando la fecha seleccionada no es hoy.
- Lista resumen de producción de la fecha seleccionada como panel colapsable arriba.

---

### ROL: Repartidor (`repartidor`)
**Quién:** Persona que retira los pedidos, los entrega y cobra.

**Puede:**
- Ver pedidos en estado EN PRODUCCIÓN del día (solo lectura + acción de emergencia)
- Ver pedidos en estado LISTO PARA REPARTO del día
- Ver pedidos en estado EN REPARTO del día
- Avance de emergencia: pedido EN PRODUCCIÓN → EN REPARTO (si ya retiró físicamente y producción no lo marcó)
- Ver detalle del pedido: cliente, dirección, lista de productos y cantidades, total a cobrar
- Marcar pedido como "Entregado" registrando: forma de cobro, monto cobrado, observaciones
- Marcar pedido como "Entrega fallida" con motivo en texto libre
- Ver su historial de entregas del día
- **Puede ver el historial de días anteriores (solo lectura). Para fechas distintas a hoy: solo pedidos cerrados, sin acciones.**
- Funcionar en modo offline con sincronización automática al reconectar (solo aplica para hoy; sin conexión en día anterior muestra caché si existe)

**No puede:**
- Crear ni editar pedidos
- Ver precios de costo ni información interna
- Acceder al dashboard de administración
- Modificar clientes ni productos

**Vista principal:** Cards de pedidos del día con cliente, dirección y total a cobrar. Detalle expandible. Botón de acción prominente por pedido. Indicador de estado de conexión siempre visible. Selector de fecha en el header para consultar historial.

---

### ROL: Superadmin (`superadmin`)
Todo lo del admin + configuración técnica, gestión de roles, acceso a logs.

---

## Matriz de permisos

| Acción | Admin | Producción | Repartidor |
|---|:---:|:---:|:---:|
| Ver todos los pedidos | ✅ | ❌ | ❌ |
| Ver pedidos EN PRODUCCIÓN (fecha seleccionada, cualquier día) | ✅ | ✅ | ❌ |
| Ver pedidos EN PRODUCCIÓN (solo hoy) | ✅ | ✅ | ✅ (lectura + emergencia) |
| Ver pedidos LISTO PARA REPARTO | ✅ | ✅ | ✅ |
| Ver pedidos EN REPARTO | ✅ | ❌ | ✅ |
| Crear pedido | ✅ | ❌ | ❌ |
| Editar pedido | ✅ | ❌ | ❌ |
| Anular pedido | ✅ | ❌ | ❌ |
| Ver precios y totales | ✅ | ❌ | ✅ (solo total a cobrar) |
| Avanzar estado (producción → listo) | ✅ | ✅ | ❌ |
| Avanzar emergencia (producción → en reparto) | ✅ | ❌ | ✅ |
| Avanzar estado (listo → en reparto → entregado) | ✅ | ❌ | ✅ |
| Registrar cobro | ✅ | ❌ | ✅ |
| Editar cobro en pedido cerrado | ✅ | ❌ | ❌ |
| Lista resumen producción | ✅ | ✅ | ❌ |
| Filtrar producción por fecha | ✅ | ✅ | ❌ |
| ABM clientes | ✅ | ❌ | ❌ |
| ABM productos | ✅ | ❌ | ❌ |
| Dashboard general + ventas | ✅ | ❌ | ❌ |
| Gestión de usuarios | ✅ | ❌ | ❌ |
| Ver historial de días anteriores | ✅ | ✅ | ✅ (solo lectura) |
| Navegar fechas con selector (‹ / ›) | ✅ | ✅ | ✅ |

## Notas
- Login con email + contraseña. Sin registro público.
- Sesión persistente (no expira sola).
- El avance de emergencia del repartidor queda registrado en el historial con usuario y timestamp.
- Los usuarios se desactivan, nunca se eliminan.
