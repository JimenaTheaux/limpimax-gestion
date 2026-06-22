// Claves centralizadas para TanStack Query
// Usar siempre estos valores en queryKey, invalidateQueries y prefetchQuery

export const queryKeys = {
  pedidos: {
    all:           ['pedidos']                                                         as const,
    list:          (filtros?: object)          => ['pedidos', filtros]                 as const,
    detail:        (id: string)                => ['pedidos', id]                      as const,
    dashPeriodo:   (d: string, h: string)      => ['pedidos', 'dash-periodo',          d, h] as const,
    dashCobros:    (d: string, h: string)      => ['pedidos', 'dash-cobros',           d, h] as const,
    dashEvolucion: (d: string, h: string)      => ['pedidos', 'dash-evolucion-rango',  d, h] as const,
  },
  clientes: {
    all:    ['clientes']                                                                   as const,
    list:   (q?: string, activo?: boolean | null) => ['clientes', q, activo]              as const,
    detail: (id: string)                          => ['clientes', id]                     as const,
  },
  productos: {
    all:        ['productos']                                                              as const,
    list:       (q?: string, catId?: string, activo?: boolean | null) => ['productos', q, catId, activo] as const,
    categorias: ['categorias']                                                             as const,
  },
  produccion: {
    all:     ['produccion']                                                                as const,
    list:    (fecha?: string) => ['produccion', fecha]                                    as const,
    listos:  ['produccion', 'listos']                                                      as const,
    resumen: (fecha: string)  => ['produccion', 'resumen', fecha]                         as const,
  },
  dashboard: {
    day: (hoy: string) => ['dashboard', hoy] as const,
  },
}
