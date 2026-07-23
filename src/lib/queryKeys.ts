// Query keys centralizadas — evita invalidaciones globales y typos en keys duplicadas.

export const queryKeys = {
  pedidos: {
    all:    ()                    => ['pedidos'] as const,
    list:   (filtros?: object)    => ['pedidos', filtros] as const,
    detail: (id: string | null)   => ['pedidos', id] as const,
  },
  produccion: {
    all:     ()                => ['produccion'] as const,
    list:    (fecha?: string)  => ['produccion', fecha] as const,
    listos:  ()                => ['produccion', 'listos'] as const,
    resumen: (fecha: string)   => ['produccion', 'resumen', fecha] as const,
  },
  clientes: {
    all:        ()                                          => ['clientes'] as const,
    list:       (q?: string, activo?: boolean | null)       => ['clientes', q, activo] as const,
    detail:     (id: string)                                => ['clientes', id] as const,
    conDeuda:   ()                                          => ['clientes-con-deuda'] as const,
    pendientes: (clienteId: string | null)                  => ['cliente-pendientes', clienteId] as const,
  },
  productos: {
    all:        ()                                                              => ['productos'] as const,
    list:       (q?: string, categoriaId?: string, activo?: boolean | null)     => ['productos', q, categoriaId, activo] as const,
    categorias: ()                                                              => ['categorias'] as const,
  },
  fragancias: {
    all:  () => ['fragancias', 'all'] as const,
    list: () => ['fragancias', 'activas'] as const,
  },
  egresos: {
    all:  ()                                                        => ['egresos'] as const,
    list: (mes: number, anio: number, categoriaId?: string)         => ['egresos', mes, anio, categoriaId ?? null] as const,
  },
  categoriasEgreso: {
    all: () => ['categorias-egreso'] as const,
  },
  usuarios: {
    all: () => ['usuarios'] as const,
  },
  dashboard: {
    hoy: (fecha: string) => ['dashboard', fecha] as const,
  },
}
