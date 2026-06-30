# 04 — Funcionalidades por Módulo

## MÓDULO 1: Autenticación

### F1.1 — Login
- Formulario: email + contraseña con float labels
- Sin registro público; usuarios creados solo por Admin
- Sesión persistente (no expira sola)
- Redirección automática según rol al ingresar
- Error inline: "Credenciales incorrectas. Intentá de nuevo." — sin alert del browser

### F1.2 — Gestión de sesión
- Logout manual disponible siempre
- Si el token expira con datos offline pendientes de sync, no se pierden

---

## MÓDULO 2: Pedidos (núcleo del sistema)

### F2.1 — Crear pedido (Admin)
Se abre en un drawer/sheet lateral (50% desktop, 100% mobile) con fondo oscurecido.

**Campos:**
- Cliente: selector con búsqueda por texto + botón "+ Cliente nuevo" que expande mini-form inline
- Fecha de producción (date picker nativo estilizado)
- Lista de ítems:
  - Producto (select del catálogo)
  - Cantidad
  - Precio unitario (precargado según tipo de cliente: mayorista/minorista; editable)
  - Subtotal calculado automáticamente
  - Bidón nuevo (checkbox por ítem)
- Costo de envío (opcional, numérico)
- Saldo del cliente (cargado automáticamente al seleccionar cliente):
  - Se lee `clientes.saldo_pendiente` del cliente seleccionado
  - Si > 0: aparece como "Saldo pendiente anterior" y suma al total
  - Si < 0: aparece como "Saldo a favor" y resta del total
  - Si = 0: no se muestra
  - El monto es editable manualmente (campo inline en el resumen de totales, igual que envío)
  - Al guardar, el valor final se guarda en `pedidos.saldo_anterior_aplicado`
- Total: calculado automáticamente (`subtotal + costo_envio + saldo_anterior_aplicado`), pero editable manualmente (si se modifica manualmente, se resalta visualmente)
- Notas internas (solo Admin)
- Notas para producción (visible para Producción y Admin)

**Comportamiento de precios:**
- Al seleccionar cliente, ítems se precargan con precio según tipo (mayorista/minorista)
- Admin puede modificar precio de cualquier ítem antes de confirmar
- Total se recalcula al agregar/quitar ítems; si Admin edita el total directamente, ese valor tiene precedencia
- Al guardar, el precio de cada ítem queda congelado como snapshot
- Cambios futuros en el ABM no afectan pedidos ya creados

**Acciones footer del drawer:**
- "Guardar borrador" (botón secondary)
- "Confirmar pedido" (botón primary) → pasa a EN PRODUCCIÓN automáticamente

**Validaciones:** al menos 1 ítem, cliente obligatorio, fecha de producción obligatoria.

### F2.1.1 — Marca de bidón nuevo
- Checkbox por ítem: "¿Bidón nuevo?"
- Campo `bidon_nuevo` boolean en `pedido_items`, default `false`
- Aparece como badge naranja "Bidón nuevo" en detalle del pedido (Admin) y en vista de producción
- En lista resumen producción: muestra cuántas unidades requieren bidón nuevo vs reutilizado
- No aparece en vista del repartidor

### F2.2 — Editar pedido (Admin)
- Disponible en estados BORRADOR, CONFIRMADO, EN PRODUCCIÓN
- Se abre en el mismo drawer lateral
- Muestra historial de cambios de estado
- **Alerta de precio desactualizado:** si el precio de un ítem cambió en el ABM desde la creación, muestra alerta por ítem con precio original vs actual. El Admin elige: mantener original o actualizar.

### F2.3 — Ver detalle de pedido
- Todos los roles pueden ver el detalle (campos visibles según rol)
- Se abre en drawer lateral (detalle expandible, no página nueva)
- Historial de estados con timestamps y usuario responsable

### F2.4 — Listado de pedidos (Admin)
- Vista principal del dashboard
- Filtros: por estado, por fecha de producción, por cliente
- Búsqueda por número de pedido o nombre de cliente
- Indicadores visuales de estado (badge con colores exactos de la tabla)
- Acceso rápido a cambiar estado (override)

### F2.5 — Anular pedido (Admin)
- Disponible desde cualquier estado excepto CERRADO
- Se abre drawer con campo de motivo obligatorio
- El pedido anulado se oculta de vistas operativas pero queda en historial

---

## MÓDULO 3: Vista de Producción

### F3.1 — Lista resumen de producción (descargable)
- Panel colapsable arriba de la vista
- Filtro por fecha de producción (selector de día)
- Agrupado por artículo: nombre, presentación, cantidad total, unidades con bidón nuevo
- Descargable / imprimible
- Sin precios, totales ni datos de cobro

### F3.2 — Panel de pedidos a producir

**Desktop (kanban horizontal):**
- Una columna por fecha de producción, ordenadas cronológicamente
- Hoy destacado (borde o fondo diferenciado)
- Scroll horizontal cuando hay muchas columnas
- Dentro de cada columna: cards de pedido con número, cliente, ítems resumidos, badges

**Mobile (lista agrupada):**
- Encabezado de día: "Hoy — Lun 2 jun · 3 pedidos" + línea divisora
- Pedidos debajo del encabezado como cards
- Scroll vertical único

**Ambas vistas muestran:**
- Número de pedido
- Nombre del cliente
- Lista de productos con cantidades
- Notas para producción
- Badge "Bidón nuevo" si aplica
- Hora de ingreso al estado actual
- Sin precios ni totales

### F3.3 — Marcar como "Listo para reparto"
- Botón prominente por pedido (mínimo 48px altura en mobile)
- Confirmación simple (un tap de confirmación)
- El pedido desaparece de la lista al avanzar

### F3.4 — Vista de "Listos hoy"
- Lista de pedidos marcados como listos ese día (solo lectura)
- Para seguimiento del trabajo del día

---

## MÓDULO 4: Vista del Repartidor

### F4.1 — Lista de pedidos del día
- Solo pedidos del día actual (fecha_produccion = hoy)
- Estados visibles: EN PRODUCCIÓN, LISTO PARA REPARTO, EN REPARTO
- Cards con: número, cliente, dirección, total a cobrar (destacado), badge de estado
- Al tocar la card: expande detalle con lista completa de productos y cantidades
- Ordenados por número de pedido

### F4.2 — Avance de emergencia
- Disponible si pedido está EN PRODUCCIÓN
- Confirmación explícita: "¿Confirmás que ya retiraste este pedido?"
- Registrado en historial con usuario y timestamp

### F4.3 — Iniciar reparto
- Botón "Salir a repartir" pasa todos los LISTO PARA REPARTO a EN REPARTO de una vez
- O acción individual por pedido

### F4.4 — Cerrar pedido (entrega + cobro)
- Se abre mini-form inline en la card del pedido
- **Lista de pagos (reemplaza forma_cobro/monto_cobrado único):**
  - Cada fila: forma de pago (Efectivo / Transferencia) + monto
  - Botón "+ Agregar otro pago" para casos de pago combinado
  - Botón quitar fila (mínimo 1 fila, no puede quedar vacío)
  - El resumen muestra en tiempo real: total del pedido, total pagado, diferencia
    - Diferencia = 0 → indicador "✓ Pago completo"
    - Diferencia > 0 → "Queda pendiente: $X"
    - Diferencia < 0 → "A favor del cliente: $X"
  - Se puede confirmar el cierre aunque quede diferencia (pago parcial válido)
- Fecha de cobro (date input, default hoy)
- Observaciones (opcional)
- Botón "Confirmar entrega" (primary, 44px en mobile)
- Al confirmar:
  1. Se insertan en `pedido_pagos` una fila por cada pago
  2. `clientes.saldo_pendiente` = diferencia (total_pedido - suma_pagos); reemplaza el valor anterior
  3. El pedido pasa a estado CERRADO
  4. `estado_pago` = 'cobrado' si diferencia ≤ 0; 'pendiente' si diferencia > 0
  5. Se registra en `pedido_historial`
- Badge en la card pasa a CERRADO visualmente

### F4.5 — Registrar entrega fallida
- Se abre drawer/sheet
- Motivo: campo de texto libre obligatorio
- Botón "Confirmar falla" (destructivo)

### F4.6 — Modo offline
- Pedidos del día se descargan al abrir la app con conexión
- Acciones sin conexión se guardan localmente (IndexedDB via `offlineQueue`)
- Al reconectar: sincronización automática en orden cronológico
- Indicador visible siempre: dot verde "En línea" / dot gris "Sin conexión"
- Banner amarillo cuando hay cambios pendientes de sincronizar: "N cambios pendientes"
- **Limitación conocida:** cambios de estado offline no escriben en `pedido_historial`.
  La sincronización actualiza `pedidos.estado` directamente, sin pasar por la RPC `cambiar_estado_pedido`.
  El historial queda incompleto para acciones tomadas sin conexión.
- Acciones que se encolan offline: cambiarEstado, cerrarPedido, editarCobro

---

## MÓDULO 5: Dashboard de Administración

### F5.1 — Resumen del día
Cards KPI:
- Total de pedidos
- Pedidos en producción
- Pedidos en reparto (listos + en camino)
- Pedidos con entrega fallida (alerta visual)
- **Cobrado hoy:** pedidos estado=cerrado AND estado_pago=cobrado · suma de monto_cobrado · desglose efectivo/transferencia
- **Pendiente de cobro** (alerta visual): suma de `clientes.saldo_pendiente` para todos los clientes con saldo > 0 · conteo de clientes · click abre panel agrupado por cliente

### F5.2 — Tablero de estados
- Lista agrupada por estado con conteo por grupo
- Cada pedido como card con: número, cliente, total, badge de estado
- Clic → abre drawer lateral con detalle completo y acciones de override

### F5.3 — Seguimiento de cobros (drawer pendientes)
El drawer "Pendientes de cobro" agrupa por cliente, no por pedido individual:
- Una card por cliente con `saldo_pendiente > 0`
- Muestra: nombre del cliente, monto total que debe (`saldo_pendiente`), botón WhatsApp de recordatorio, botón "Ver detalle"
- El botón WhatsApp abre la app con un mensaje de texto predefinido al número del cliente (sin generar imagen)
- Al expandir "Ver detalle": lista de los pedidos cerrados con `estado_pago=pendiente` de ese cliente
  - Columnas: Pedido (P-XXXXX) · Fecha producción · Total del pedido · Cuánto pagó (suma pedido_pagos) · Cuánto queda (diferencia)
- El total del drawer es la suma de `saldo_pendiente` de todos los clientes con saldo > 0
- Fuente de datos: `clientes.saldo_pendiente` para el total; `pedidos` con estado=cerrado AND estado_pago=pendiente para el detalle expandible

### F5.4 — Dashboard de ventas (KPIs)
- Selector de rango personalizado: inputs date [Desde] [Hasta]; default = primer día del mes → hoy
- **Pedidos** (count, pendientes de cierre, panel de estados): filtrados por `fecha_produccion`
- **Cobros** (total cobrado, efectivo, transferencia, delta vs mes anterior): filtrados por `fecha_cobro`
  - Esto permite ver "hice 10 pedidos esta semana pero cobré algunos de la semana pasada"
  - Registros sin `fecha_cobro` (pendientes o datos legacy) no aparecen en los KPIs de cobro
- Gráfico de evolución: cobros agrupados por `fecha_cobro`, comparado con el mismo rango del mes anterior

---

## MÓDULO 6: ABM de Clientes (Admin)

### F6.1 — Lista de clientes
- Búsqueda por nombre o dirección
- Indicador activo / inactivo
- Botón "+ Nuevo cliente" abre drawer lateral
- **Semáforo de saldo** (badge junto a cada cliente):
  - `saldo_pendiente > 0` → badge rojo "Debe $X"
  - `saldo_pendiente == 0` o null → badge azul accent "Al día"
  - `saldo_pendiente < 0` → badge verde "A favor $X"
- **Filtro rápido de saldo** (pills, debajo del buscador): Todos · Con deuda · Al día · Con saldo a favor
  - Filtrado client-side sobre los datos ya cargados (complementa el filtro activo/inactivo)
  - "Con deuda": muestra solo clientes con `saldo_pendiente > 0`
  - "Al día": muestra clientes con `saldo_pendiente == 0` o null
  - "Con saldo a favor": muestra clientes con `saldo_pendiente < 0`

### F6.2 — Crear / editar cliente (en drawer)
- Nombre y apellido (obligatorio)
- Teléfono
- Dirección de entrega (texto único)
- Tipo de cliente: Mayorista / Minorista
- Observaciones (opcional)

### F6.3 — Ingreso rápido desde formulario de pedido
- Mini-form inline sin salir del drawer de pedido
- Campos: nombre + teléfono + dirección
- Perfil completable después desde el ABM

---

## MÓDULO 7: ABM de Productos (Admin)

### F7.1 — Lista de productos
- Búsqueda por nombre, filtro por categoría
- Indicador activo / inactivo
- Botón "+ Nuevo producto" abre drawer lateral
- Gestión de categorías: editar nombre y borrar desde drawer accesible en la vista de productos.
  Borrar una categoría no afecta los productos — quedan sin categoría.
  No se puede borrar una categoría si tiene productos activos asociados.

### F7.2 — Crear / editar producto (en drawer)
- Categoría, nombre (obligatorio), fragancia
- Unidad: litros (fijo)
- Presentación: lista fija `[0.5, 3, 5, 10, 20]` litros
- Precio minorista y mayorista
- Activo / inactivo

**Lógica de precios:**
- Dos precios por producto: minorista y mayorista
- Al crear pedido, sistema precarga según tipo de cliente
- Admin puede editar precio por ítem en el pedido sin afectar el catálogo
- Cambiar precios en ABM no modifica pedidos ya existentes

**Borrar producto:**
- Disponible si el producto no tiene pedidos asociados. Si tiene historial de pedidos, solo se puede inactivar.
- Cambiar el precio de un producto NO modifica pedidos existentes — cada ítem de pedido conserva el `precio_unitario` snapshot del momento de creación.

---

## MÓDULO 8B: Perfil y Cambio de Contraseña

### F8B.1 — Mi perfil (todos los roles)

Accesible desde:
- **Admin:** ítem "Mi perfil" en el sidebar (`/admin/perfil`)
- **Producción:** tab "Perfil" en el bottom nav (`/produccion/perfil`)
- **Repartidor:** tab "Perfil" en el bottom nav (`/repartidor/perfil`)

Contenido de la página:
- Card de identidad: avatar con iniciales, nombre completo, rol (solo lectura)
- Formulario "Cambiar contraseña":
  - Contraseña actual (obligatorio — se re-autentica antes de cambiar)
  - Nueva contraseña (mínimo 8 caracteres)
  - Confirmar nueva contraseña (debe coincidir)
  - Toggle de visibilidad en cada campo (ojo)
- La sesión se mantiene activa después del cambio
- Implementación: `supabase.auth.updateUser({ password })` previo re-auth con `signInWithPassword`

### F8B.2 — Resetear contraseña de un usuario (solo Admin)

Accesible desde: drawer de editar usuario en `/admin/usuarios`.

- Sección colapsable "Restablecer contraseña" al final del formulario de editar
- Campo: nueva contraseña (mínimo 6 caracteres, sin confirmar — el admin la define)
- No requiere la contraseña actual del usuario
- Implementación: `supabaseAdmin.auth.admin.updateUserById(userId, { password })`
- Requiere `VITE_SUPABASE_SERVICE_ROLE_KEY` configurada (igual que crear usuarios)
- Nota visible: "El usuario deberá usar esta contraseña en su próximo inicio de sesión"
- El Admin no puede resetear su propia contraseña desde aquí — usa "Mi perfil"

---

## MÓDULO 8: Gestión de Usuarios (Admin)

### F8.1 — Lista de usuarios
- Nombre, email, rol, activo/inactivo
- Botón "+ Nuevo usuario" abre drawer

### F8.2 — Crear usuario (en drawer)
- Nombre, email, contraseña temporal, rol

### F8.3 — Editar / desactivar usuario
- Cambiar nombre, rol o estado
- No se eliminan, solo se desactivan

---

## MÓDULO 9: Generación de documentos

### F9.1 — Documento por pedido (para cliente)
- Desde detalle del pedido por Admin
- Contenido: número, fecha, datos del cliente, productos, precios, total
- Formato: PDF descargable o vista imprimible

### F9.2 — Listado del día para repartidor
- Generado por Admin
- Contenido: pedidos del día con cliente, dirección, productos resumidos, total a cobrar
- Formato: PDF descargable o vista imprimible

### F9.3 — Compartir factura por WhatsApp (JPG)
- Disponible desde: detalle de pedido (drawer), tabla de pedidos (acción rápida), panel de pagos pendientes del dashboard
- Genera la factura del pedido como imagen JPG (600px, escala 2x) usando html2canvas sobre el componente FacturaCanvas
- En mobile con Web Share API disponible: abre el selector nativo de apps con el JPG adjunto
- En desktop o mobile sin Web Share API: descarga el JPG automáticamente + abre WhatsApp Web con el número del cliente precargado y un mensaje predeterminado
- Si el cliente tiene teléfono registrado: `wa.me/54[telefono]` (prefijo Argentina)
- Si no tiene teléfono: `wa.me/?text=mensaje` (el usuario elige el contacto)
- Loading state en el botón mientras se genera el JPG: deshabilitado + texto "Generando…"
- Si html2canvas falla: toast de error "No se pudo generar la imagen"
- Componentes: `FacturaCanvas`, `BtnWhatsapp` (variantes "icono" y "pill"), hook `useCompartirFactura`

---

## MÓDULO 10: Notificaciones (fuera del MVP)
Post-MVP. Web Push API cuando:
- Pedido nuevo entra a EN PRODUCCIÓN → notifica a Producción
- Pedido modificado en EN PRODUCCIÓN → notifica a Producción
- Pedido pasa a LISTO PARA REPARTO → notifica a Repartidor
- Entrega fallida → notifica a Admin

---

## MÓDULO 11: Egresos (Admin)

### F11.1 — Listado de egresos

- Solo accesible para rol Admin
- Tabla con columnas: Fecha · Categoría · Concepto · Registrado por · Monto · Acciones
- Filtro por mes/año: selector mes + año, default mes actual
- Filtro por categoría: select con todas las categorías + "Todas"
- Total del período: suma del monto filtrado, visible arriba de la tabla
  formato: "$X.XXX,00 en [mes año]"
- Botón "+ Agregar egreso" abre drawer lateral
- Acciones por fila: editar (lápiz) · eliminar (papelera con confirmación)
- Estado vacío: "Sin egresos para este período"

### F11.2 — Registrar egreso (drawer)

Campos:
- Fecha (DATE, obligatorio, default hoy)
- Categoría (select obligatorio):
    sueldos | alquiler | droguería | gráfica | packaging | luz | otros
- Concepto (texto libre, obligatorio)
- Monto (numérico, obligatorio, inputMode decimal)
- Registrado por (select de usuarios activos, default usuario actual)

### F11.3 — Editar egreso

Mismos campos que registrar.
Se abre en el mismo drawer con datos precargados.

### F11.4 — Eliminar egreso

Confirmación inline antes de eliminar:
"¿Eliminar este egreso? Esta acción no se puede deshacer."
Botones: [Sí, eliminar] (error) · [Cancelar]

### Categorías disponibles (enum fijo en DB):
  sueldos · alquiler · droguería · gráfica · packaging · luz · otros

### Reglas:
- Solo Admin puede ver, crear, editar y eliminar egresos
- No hay soft delete — se borra definitivamente
- El campo registrado_por guarda quién cargó el egreso
