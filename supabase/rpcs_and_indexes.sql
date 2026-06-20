-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPIMAX — RPCs atómicas + índices de performance
-- Ejecutar en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── ÍNDICES ────────────────────────────────────────────────────────────────
-- Cubren las queries más frecuentes. Si ya existen, IF NOT EXISTS los ignora.

CREATE INDEX IF NOT EXISTS idx_pedidos_estado
  ON pedidos(estado);

CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_produccion
  ON pedidos(fecha_produccion);

CREATE INDEX IF NOT EXISTS idx_pedidos_created_at
  ON pedidos(created_at DESC);

-- Índice compuesto para la query del repartidor (fecha + estado)
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_estado
  ON pedidos(fecha_produccion, estado)
  WHERE estado IN ('en_produccion', 'listo_reparto', 'en_reparto');

-- Nota: no se puede indexar DATE(created_at) porque DATE() es STABLE (timezone-dependent).
-- El índice idx_pedidos_created_at (created_at DESC) ya cubre las queries de rango del dashboard.

CREATE INDEX IF NOT EXISTS idx_pedido_historial_pedido_id
  ON pedido_historial(pedido_id, created_at);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id
  ON pedido_items(pedido_id);

CREATE INDEX IF NOT EXISTS idx_perfiles_id
  ON perfiles(id);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre
  ON clientes(nombre text_pattern_ops);   -- acelera ilike '%texto%'


-- ─── RPC 1: cambiar_estado_pedido ───────────────────────────────────────────
-- Cambia el estado y registra en historial en una sola transacción atómica.
-- Antes: 2 HTTP requests (update + insert). Ahora: 1 HTTP request, 2 queries DB.

CREATE OR REPLACE FUNCTION public.cambiar_estado_pedido(
  p_pedido_id       uuid,
  p_estado_nuevo    text,
  p_estado_anterior text,
  p_usuario_id      uuid  DEFAULT NULL,
  p_notas           text  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pedidos
  SET
    estado     = p_estado_nuevo::estado_pedido,
    updated_at = NOW()
  WHERE id = p_pedido_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % no encontrado', p_pedido_id;
  END IF;

  INSERT INTO pedido_historial (
    pedido_id, estado_anterior, estado_nuevo, usuario_id, notas, created_at
  ) VALUES (
    p_pedido_id,
    CASE WHEN p_estado_anterior IS NOT NULL
         THEN p_estado_anterior::estado_pedido
         ELSE NULL END,
    p_estado_nuevo::estado_pedido,
    p_usuario_id,
    p_notas,
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cambiar_estado_pedido(uuid, text, text, uuid, text)
  TO authenticated, anon;


-- ─── RPC 2: registrar_entrega ────────────────────────────────────────────────
-- Registra entrega: actualiza estado + cobro + notas_entrega en una operación.
-- Antes: cambiarEstado (2 queries) + editarCobro (1 query) = 3 queries, 2 HTTP.
-- Ahora: 1 HTTP request, 2 queries atómicas.

CREATE OR REPLACE FUNCTION public.registrar_entrega(
  p_pedido_id       uuid,
  p_estado_anterior text,
  p_forma_cobro     text,
  p_monto_cobrado   numeric DEFAULT NULL,
  p_notas_entrega   text    DEFAULT NULL,
  p_usuario_id      uuid    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pedidos
  SET
    estado        = 'entregado'::estado_pedido,
    forma_cobro   = p_forma_cobro,
    monto_cobrado = p_monto_cobrado,
    notas_entrega = p_notas_entrega,
    updated_at    = NOW()
  WHERE id = p_pedido_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % no encontrado', p_pedido_id;
  END IF;

  INSERT INTO pedido_historial (
    pedido_id, estado_anterior, estado_nuevo, usuario_id, notas, created_at
  ) VALUES (
    p_pedido_id,
    p_estado_anterior::estado_pedido,
    'entregado'::estado_pedido,
    p_usuario_id,
    p_notas_entrega,
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_entrega(uuid, text, text, numeric, text, uuid)
  TO authenticated, anon;


-- ─── RPC 3: anular_pedido ───────────────────────────────────────────────────
-- Anula con validación y registra historial en una transacción.

CREATE OR REPLACE FUNCTION public.anular_pedido(
  p_pedido_id       uuid,
  p_estado_anterior text,
  p_motivo          text,
  p_usuario_id      uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_estado_anterior = 'cerrado' THEN
    RAISE EXCEPTION 'No se puede anular un pedido cerrado';
  END IF;

  IF p_estado_anterior = 'anulado' THEN
    RAISE EXCEPTION 'El pedido ya está anulado';
  END IF;

  UPDATE pedidos
  SET
    estado           = 'anulado'::estado_pedido,
    motivo_anulacion = p_motivo,
    updated_at       = NOW()
  WHERE id = p_pedido_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % no encontrado', p_pedido_id;
  END IF;

  INSERT INTO pedido_historial (
    pedido_id, estado_anterior, estado_nuevo, usuario_id, notas, created_at
  ) VALUES (
    p_pedido_id,
    p_estado_anterior::estado_pedido,
    'anulado'::estado_pedido,
    p_usuario_id,
    p_motivo,
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.anular_pedido(uuid, text, text, uuid)
  TO authenticated, anon;


-- ─── RPC 4: get_dashboard_stats ──────────────────────────────────────────────
-- Devuelve KPIs del dashboard en una sola query en vez de 2 HTTP requests.
-- Retorna JSON con estructura { hoy: {...}, activos: {...}, pedidosHoy: [...] }

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_fecha date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  pedidos_hoy AS (
    SELECT
      id, numero, estado::text, total_calculado, total_manual,
      forma_cobro, monto_cobrado, fecha_produccion, cliente_id
    FROM pedidos
    WHERE created_at::date = p_fecha
  ),
  hoy_agg AS (
    SELECT
      COUNT(*)::int                                                         AS total,
      COALESCE(
        jsonb_object_agg(estado, cnt) FILTER (WHERE cnt > 0),
        '{}'::jsonb
      )                                                                     AS por_estado,
      COALESCE(SUM(
        CASE WHEN estado IN ('entregado','cerrado') AND forma_cobro = 'efectivo'
             THEN COALESCE(monto_cobrado, 0) ELSE 0 END), 0)              AS total_efectivo,
      COALESCE(SUM(
        CASE WHEN estado IN ('entregado','cerrado') AND forma_cobro = 'transferencia'
             THEN COALESCE(monto_cobrado, 0) ELSE 0 END), 0)              AS total_transferencia,
      COALESCE(SUM(
        CASE WHEN estado IN ('entregado','cerrado')
             THEN COALESCE(monto_cobrado, 0) ELSE 0 END), 0)              AS total_cobrado,
      COUNT(
        CASE WHEN estado IN ('entregado','cerrado')
             AND (forma_cobro = 'pendiente' OR forma_cobro IS NULL)
             THEN 1 END)::int                                              AS cobrando_pendientes
    FROM (
      SELECT *, COUNT(*) OVER (PARTITION BY estado) AS cnt
      FROM pedidos_hoy
    ) t
  ),
  activos_agg AS (
    SELECT
      COUNT(*)::int                                        AS total,
      COALESCE(
        jsonb_object_agg(estado, cnt) FILTER (WHERE cnt > 0),
        '{}'::jsonb
      )                                                    AS por_estado
    FROM (
      SELECT estado::text, COUNT(*) AS cnt
      FROM pedidos
      WHERE estado NOT IN ('cerrado'::estado_pedido, 'anulado'::estado_pedido)
      GROUP BY estado
    ) t
  )
  SELECT json_build_object(
    'hoy', json_build_object(
      'total',              h.total,
      'porEstado',          h.por_estado,
      'totalEfectivo',      h.total_efectivo,
      'totalTransferencia', h.total_transferencia,
      'totalCobrado',       h.total_cobrado,
      'cobrandoPendientes', h.cobrando_pendientes
    ),
    'activos', json_build_object(
      'total',     a.total,
      'porEstado', a.por_estado
    ),
    'pedidosHoy', (
      SELECT COALESCE(json_agg(json_build_object(
        'id',              ph.id,
        'numero',          ph.numero,
        'estado',          ph.estado,
        'totalCalculado',  ph.total_calculado::text,
        'totalManual',     ph.total_manual::text,
        'formaCobro',      ph.forma_cobro,
        'montoCobrado',    ph.monto_cobrado::text,
        'fechaProduccion', ph.fecha_produccion,
        'clienteId',       ph.cliente_id
      )), '[]'::json)
      FROM pedidos_hoy ph
    )
  )
  FROM hoy_agg h, activos_agg a
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(date)
  TO authenticated, anon;


-- ─── Verificar que las funciones existen ────────────────────────────────────
SELECT
  proname   AS funcion,
  pg_get_function_identity_arguments(oid) AS argumentos
FROM pg_proc
WHERE proname IN (
  'cambiar_estado_pedido',
  'registrar_entrega',
  'anular_pedido',
  'get_dashboard_stats'
)
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
