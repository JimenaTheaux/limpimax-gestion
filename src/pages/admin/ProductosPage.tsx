import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Package, Tag } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton }       from '@/components/ui/skeleton'
import { FloatInput }     from '@/components/common/FloatInput'
import { FloatSelect }    from '@/components/common/FloatSelect'
import { ButtonGroup }    from '@/components/common/ButtonGroup'
import { BadgeActivo }    from '@/components/common/BadgeEstado'
import { EmptyState }     from '@/components/common/EmptyState'
import { ToastContainer } from '@/components/common/ToastContainer'
import { useToast }       from '@/hooks/useToast'
import {
  useProductos, useCategorias,
  useCrearProducto, useEditarProducto, useCrearCategoria,
} from '@/services/productos'
import type { Producto } from '@/types'


// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre:          z.string().min(1, 'El nombre es obligatorio'),
  fragancia:       z.string().optional(),
  categoriaId:     z.string().optional(),
  presentacion:    z.enum(['0.5', '3', '5', '10', '20'], { message: 'Seleccioná una presentación' }),
  precioMinorista: z.string().min(1, 'Requerido').regex(/^\d+(\.\d{0,2})?$/, 'Precio inválido'),
  precioMayorista: z.string().min(1, 'Requerido').regex(/^\d+(\.\d{0,2})?$/, 'Precio inválido'),
  codigo:          z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Drawer formulario ────────────────────────────────────────────────────────

interface DrawerProps {
  open:     boolean
  onClose:  () => void
  producto: (Producto & { categoriaNombre?: string }) | null
  onSaved:  (msg: string) => void
}

function ProductoDrawer({ open, onClose, producto, onSaved }: DrawerProps) {
  const crear  = useCrearProducto()
  const editar = useEditarProducto()
  const crearCat = useCrearCategoria()
  const { data: categorias } = useCategorias()
  const [nuevaCat, setNuevaCat] = useState('')
  const [showCatInput, setShowCatInput] = useState(false)
  const saving = crear.isPending || editar.isPending

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:          producto?.nombre          ?? '',
      fragancia:       producto?.fragancia       ?? '',
      categoriaId:     producto?.categoriaId     ?? '',
      presentacion:    (producto?.presentacion as FormData['presentacion']) ?? '5',
      precioMinorista: producto?.precioMinorista ?? '',
      precioMayorista: producto?.precioMayorista ?? '',
      codigo:          producto?.codigo          ?? '',
    },
  })

  const presentacionVal = watch('presentacion')
  const categoriaVal    = watch('categoriaId')

  const onSubmit = async (data: FormData) => {
    try {
      if (producto) {
        await editar.mutateAsync({ id: producto.id, ...data })
        onSaved('Producto actualizado correctamente')
      } else {
        await crear.mutateAsync(data)
        onSaved('Producto creado correctamente')
        reset()
      }
      onClose()
    } catch (e) {
      onSaved((e instanceof Error ? e.message : 'Error al guardar') + '|error')
    }
  }

  const handleAgregarCategoria = async () => {
    if (!nuevaCat.trim()) return
    await crearCat.mutateAsync(nuevaCat.trim())
    setNuevaCat('')
    setShowCatInput(false)
    onSaved('Categoría creada')
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{producto ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>

          <FloatInput label="Nombre *"  error={errors.nombre?.message}  {...register('nombre')} />
          <FloatInput label="Fragancia" {...register('fragancia')} />
          <FloatInput label="Código (opcional)" {...register('codigo')} />

          {/* Categoría + agregar nueva */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FloatSelect label="Categoría" value={categoriaVal ?? ''} {...register('categoriaId')}>
              <option value="">Sin categoría</option>
              {categorias?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </FloatSelect>
            {!showCatInput ? (
              <button
                type="button"
                onClick={() => setShowCatInput(true)}
                style={{ fontSize: 12, color: '#1B9ED6', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0 2px' }}
              >
                + Nueva categoría
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={nuevaCat}
                  onChange={e => setNuevaCat(e.target.value)}
                  placeholder="Nombre de categoría"
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13 }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarCategoria() } }}
                />
                <button type="button" onClick={handleAgregarCategoria}
                  style={{ background: '#0D5C8A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>
                  Agregar
                </button>
              </div>
            )}
          </div>

          <ButtonGroup
            label="Presentación *"
            value={presentacionVal ?? ''}
            onChange={v => setValue('presentacion', v as FormData['presentacion'], { shouldValidate: true })}
            error={errors.presentacion?.message}
            options={[
              { value: '0.5', label: '500 ml' },
              { value: '3',   label: '3 L' },
              { value: '5',   label: '5 L' },
              { value: '10',  label: '10 L' },
              { value: '20',  label: '20 L' },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FloatInput label="Precio minorista *" error={errors.precioMinorista?.message} {...register('precioMinorista')} inputMode="decimal" />
            <FloatInput label="Precio mayorista *" error={errors.precioMayorista?.message} {...register('precioMayorista')} inputMode="decimal" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <button type="submit" disabled={saving} style={{
              background: saving ? 'rgba(13,92,138,0.5)' : '#0D5C8A', color: '#fff',
              border: 'none', borderRadius: 10, padding: '13px 20px', minHeight: 44,
              fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button type="button" onClick={onClose} style={{
              background: 'transparent', color: '#0D5C8A', border: '1.5px solid #0D5C8A',
              borderRadius: 10, padding: '12px 20px', minHeight: 44,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancelar
            </button>
          </div>
        </form>

        {producto && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #D1D5DB' }}>
            <button
              onClick={async () => {
                await editar.mutateAsync({ id: producto.id, activo: !producto.activo })
                onSaved(`Producto ${!producto.activo ? 'activado' : 'desactivado'}`)
                onClose()
              }}
              style={{
                width: '100%',
                background: producto.activo ? '#FDECEA' : '#E8F8F0',
                color: producto.activo ? '#D32F2F' : '#2E9E5C',
                border: `1.5px solid ${producto.activo ? '#D32F2F' : '#2E9E5C'}`,
                borderRadius: 10, padding: '12px 20px', minHeight: 44,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {producto.activo ? 'Desactivar producto' : 'Activar producto'}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Card de producto ─────────────────────────────────────────────────────────

type ProductoConCat = Producto & { categoriaNombre?: string }

function ProductoCard({ producto, onEdit }: { producto: ProductoConCat; onEdit: () => void }) {
  const presentacionLabel = producto.presentacion === '0.5' ? '500 ml' : `${producto.presentacion} L`

  return (
    <div style={{
      background: '#fff', borderRadius: 20, padding: '16px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#1A2B3C' }}>
            {producto.nombre}
            {producto.fragancia && (
              <span style={{ fontWeight: 400, color: '#4A5568', fontSize: 13 }}> — {producto.fragancia}</span>
            )}
          </span>
          <BadgeActivo activo={producto.activo ?? true} />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Presentación */}
          <span style={{ fontSize: 12, color: '#4A5568', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Package size={12} /> {presentacionLabel}
          </span>

          {/* Categoría */}
          {producto.categoriaNombre && (
            <span style={{ fontSize: 12, color: '#4A5568', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tag size={12} /> {producto.categoriaNombre}
            </span>
          )}

          {/* Precios */}
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0D5C8A' }}>
            Min: ${Number(producto.precioMinorista).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1B9ED6' }}>
            May: ${Number(producto.precioMayorista).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <button onClick={onEdit} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: '#4A5568', padding: 6, borderRadius: 8,
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }} title="Editar">
        <Edit2 size={16} />
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ProductosPage() {
  const [q, setQ]               = useState('')
  const [catFiltro, setCat]     = useState('')
  const [drawerOpen, setDrawer] = useState(false)
  const [selected, setSelected] = useState<ProductoConCat | null>(null)
  const { toasts, show, dismiss } = useToast()

  const { data: productos, isLoading } = useProductos(q || undefined, catFiltro || undefined)
  const { data: categorias }           = useCategorias()

  const handleEdit  = (p: ProductoConCat) => { setSelected(p); setDrawer(true) }
  const handleNew   = ()                   => { setSelected(null); setDrawer(true) }
  const handleClose = ()                   => { setDrawer(false); setSelected(null) }

  const handleSaved = (msg: string) => {
    if (msg.endsWith('|error')) show(msg.replace('|error', ''), 'error')
    else                        show(msg, 'success')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title">Productos</h1>
        <button onClick={handleNew} style={{
          background: '#0D5C8A', color: '#fff', border: 'none',
          borderRadius: 10, padding: '10px 16px', minHeight: 40,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre…"
            style={{ width: '100%', padding: '10px 10px 10px 36px', border: '1px solid #D1D5DB', borderRadius: 10, fontSize: 14, outline: 0, background: '#fff' }}
          />
        </div>

        <select
          value={catFiltro}
          onChange={e => setCat(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 10, fontSize: 14, background: '#fff', cursor: 'pointer' }}
        >
          <option value="">Todas las categorías</option>
          {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <Skeleton key={i} style={{ height: 80, borderRadius: 20 }} />)}
        </div>
      ) : !productos?.length ? (
        <EmptyState
          icon={Package}
          title={q || catFiltro ? 'Sin resultados' : 'No hay productos aún'}
          message={q || catFiltro ? 'Probá con otro filtro' : 'Creá el primer producto del catálogo.'}
          action={
            !(q || catFiltro) ? (
              <button onClick={handleNew} style={{
                background: '#0D5C8A', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 20px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', minHeight: 44,
              }}>
                + Nuevo producto
              </button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {productos.map(p => (
            <ProductoCard key={p.id} producto={p} onEdit={() => handleEdit(p)} />
          ))}
          <p style={{ fontSize: 12, color: '#4A5568', textAlign: 'center', marginTop: 4 }}>
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>
      )}

      <ProductoDrawer open={drawerOpen} onClose={handleClose} producto={selected} onSaved={handleSaved} />
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
