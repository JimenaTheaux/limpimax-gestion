import { useEffect, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, AlertTriangle, Package } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FloatInput }  from '@/components/common/FloatInput'
import { ButtonGroup } from '@/components/common/ButtonGroup'
import { useClientes } from '@/services/clientes'
import { useProductos } from '@/services/productos'
import { useCrearPedido, useEditarPedido, type PedidoDetalle, type ItemForm } from '@/services/pedidos'
import { useDebounce } from '@/hooks/useDebounce'
import type { Producto } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  productoId:       z.string().min(1, 'Seleccioná un producto'),
  productoNombre:   z.string(),
  presentacion:     z.string(),
  cantidad:         z.string().min(1).regex(/^\d+(\.\d+)?$/, 'Cantidad inválida'),
  precioUnitario:   z.string().min(1).regex(/^\d+(\.\d{0,2})?$/, 'Precio inválido'),
  precioReferencia: z.string(),
  bidonNuevo:       z.boolean(),
})

const schema = z.object({
  clienteId:        z.string().min(1, 'El cliente es obligatorio'),
  tipoPrecio:       z.enum(['minorista', 'mayorista']),
  fechaProduccion:  z.string().min(1, 'La fecha es obligatoria'),
  direccionEntrega: z.string().optional(),
  notasProduccion:  z.string().optional(),
  notasInternas:    z.string().optional(),
  costoEnvio:       z.string().optional(),
  totalManual:      z.string().optional(),
  items:            z.array(itemSchema).min(1, 'Agregá al menos un producto'),
})

type FormData = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  pedido:  PedidoDetalle | null
  onSaved: (msg: string) => void
}

// ─── Selector de cliente ──────────────────────────────────────────────────────

function SelectorCliente({
  value, onChange, error,
}: { value: string; onChange: (id: string, tipo: 'minorista' | 'mayorista', dir: string) => void; error?: string }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const qDebounced = useDebounce(q, 300)
  const { data: clientes } = useClientes(qDebounced || undefined)

  const selected = clientes?.find(c => c.id === value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A5568' }}>
        Cliente *
      </span>

      {selected ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: '#E8F4FF', borderRadius: 10,
          border: '1.5px solid #1B9ED6',
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1A2B3C' }}>{selected.nombre}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#4A5568' }}>
              {selected.tipocliente} {selected.direccion ? `· ${selected.direccion}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => { onChange('', 'minorista', ''); setQ('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B9ED6', fontSize: 12, fontWeight: 600 }}>
            Cambiar
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar cliente…"
            style={{
              width: '100%', padding: '10px 14px',
              border: `1.5px solid ${error ? '#D32F2F' : '#D1D5DB'}`,
              borderRadius: 10, fontSize: 14, outline: 0, background: '#fff',
            }}
          />
          {open && clientes && clientes.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#fff', border: '1px solid #D1D5DB', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto',
              marginTop: 4,
            }}>
              {clientes.slice(0, 8).map(c => (
                <button
                  key={c.id} type="button"
                  onClick={() => {
                    onChange(c.id, c.tipocliente as 'minorista' | 'mayorista', c.direccion ?? '')
                    setQ(c.nombre)
                    setOpen(false)
                  }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer', display: 'block',
                    borderBottom: '1px solid #F4F6F8',
                  }}
                >
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{c.nombre}</span>
                  <span style={{ color: '#4A5568', fontSize: 12, marginLeft: 8 }}>{c.tipocliente}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p style={{ color: '#D32F2F', fontSize: 11, margin: 0 }}>{error}</p>}
    </div>
  )
}

// ─── Fila de ítem ─────────────────────────────────────────────────────────────

function FilaItem({
  index, control, register, watch, setValue, onRemove, tipoPrecio, productos,
}: {
  index:     number
  control:   ReturnType<typeof useForm<FormData>>['control']
  register:  ReturnType<typeof useForm<FormData>>['register']
  watch:     ReturnType<typeof useForm<FormData>>['watch']
  setValue:  ReturnType<typeof useForm<FormData>>['setValue']
  onRemove:  () => void
  tipoPrecio: 'minorista' | 'mayorista'
  productos:  (Producto & { categoriaNombre?: string })[]
}) {
  const productoId     = watch(`items.${index}.productoId`)
  const cantidad       = watch(`items.${index}.cantidad`)
  const precioUnitario = watch(`items.${index}.precioUnitario`)
  const bidonNuevo     = watch(`items.${index}.bidonNuevo`)

  const producto = productos.find(p => p.id === productoId)

  // Al cambiar producto: pre-cargar precio y datos
  useEffect(() => {
    if (!producto) return
    const precio = tipoPrecio === 'mayorista' ? producto.precioMayorista : producto.precioMinorista
    setValue(`items.${index}.precioUnitario`,   precio)
    setValue(`items.${index}.precioReferencia`, precio)
    setValue(`items.${index}.productoNombre`,   producto.nombre)
    setValue(`items.${index}.presentacion`,     producto.presentacion)
  }, [productoId, tipoPrecio])

  const subtotal = (Number(cantidad) || 0) * (Number(precioUnitario) || 0)

  // Alerta de precio desactualizado
  const precioReferencia = watch(`items.${index}.precioReferencia`)
  const precioActual     = tipoPrecio === 'mayorista' ? producto?.precioMayorista : producto?.precioMinorista
  const precioDesact     = producto && precioActual && precioReferencia &&
    Number(precioActual) !== Number(precioReferencia)

  return (
    <div style={{
      background: '#F4F6F8', borderRadius: 12, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Selector de producto */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Controller
            name={`items.${index}.productoId`}
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <select
                  {...field}
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: `1px solid ${fieldState.error ? '#D32F2F' : '#D1D5DB'}`,
                    borderRadius: 10, fontSize: 13, background: '#fff', cursor: 'pointer',
                  }}
                >
                  <option value="">Seleccioná producto…</option>
                  {productos.filter(p => p.activo).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.fragancia ? ` (${p.fragancia})` : ''} — {p.presentacion}L
                    </option>
                  ))}
                </select>
                {fieldState.error && <p style={{ color: '#D32F2F', fontSize: 11, margin: '2px 0 0 2px' }}>{fieldState.error.message}</p>}
              </div>
            )}
          />
        </div>
        <button type="button" onClick={onRemove}
          style={{ background: '#FDECEA', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', color: '#D32F2F', flexShrink: 0 }}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Cantidad, precio, subtotal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <FloatInput label="Cantidad" {...register(`items.${index}.cantidad`)} inputMode="decimal" />
        <FloatInput label="Precio unit." {...register(`items.${index}.precioUnitario`)} inputMode="decimal" />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', borderRadius: 10, padding: '8px',
          border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 600, color: '#0D5C8A',
        }}>
          ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Bidón nuevo + alerta precio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={bidonNuevo}
            onChange={e => setValue(`items.${index}.bidonNuevo`, e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#F57C00', cursor: 'pointer' }}
          />
          <span>Bidón nuevo</span>
        </label>

        {precioDesact && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
            color: '#F57C00', background: '#FFF3E0', padding: '3px 8px', borderRadius: 6,
          }}>
            <AlertTriangle size={11} />
            Precio cambió a ${Number(precioActual).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            <button type="button"
              onClick={() => setValue(`items.${index}.precioUnitario`, precioActual ?? '')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F57C00', fontWeight: 700, fontSize: 11, textDecoration: 'underline' }}>
              Actualizar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Drawer principal ─────────────────────────────────────────────────────────

export function DrawerPedido({ open, onClose, pedido, onSaved }: Props) {
  const crear  = useCrearPedido()
  const editar = useEditarPedido()
  const saving = crear.isPending || editar.isPending

  const { data: productos } = useProductos()

  const defaultItems: ItemForm[] = pedido?.items?.map(i => ({
    productoId:       i.productoId,
    productoNombre:   i.productoNombre ?? '',
    presentacion:     i.productoPresentacion ?? '',
    cantidad:         i.cantidad,
    precioUnitario:   i.precioUnitario,
    precioReferencia: i.precioReferencia,
    bidonNuevo:       i.bidonNuevo,
  })) ?? []

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        clienteId:        pedido?.clienteId        ?? '',
        tipoPrecio:       pedido?.tipoPrecio        ?? 'minorista',
        fechaProduccion:  pedido?.fechaProduccion   ?? '',
        direccionEntrega: pedido?.direccionEntrega  ?? '',
        notasProduccion:  pedido?.notasProduccion   ?? '',
        notasInternas:    pedido?.notasInternas     ?? '',
        costoEnvio:       pedido?.costoEnvio        ?? '0',
        totalManual:      pedido?.totalManual       ?? '',
        items:            defaultItems,
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const tipoPrecio  = watch('tipoPrecio')
  const costoEnvio  = watch('costoEnvio')
  const totalManual = watch('totalManual')
  const items       = watch('items')

  const totalCalculado = items.reduce(
    (acc, i) => acc + (Number(i.cantidad) || 0) * (Number(i.precioUnitario) || 0), 0
  ) + (Number(costoEnvio) || 0)

  const totalMostrado = totalManual ? Number(totalManual) : totalCalculado
  const totalEditado  = !!totalManual && Number(totalManual) !== totalCalculado

  const handleClose = () => { reset(); onClose() }

  const submit = async (data: FormData, accion: 'borrador' | 'confirmar') => {
    try {
      if (pedido) {
        await editar.mutateAsync({ id: pedido.id, ...data, accion })
        onSaved('Pedido actualizado')
      } else {
        await crear.mutateAsync({ ...data, accion } as Parameters<typeof crear.mutateAsync>[0])
        onSaved(accion === 'confirmar' ? 'Pedido confirmado y enviado a producción' : 'Borrador guardado')
        reset()
      }
      onClose()
    } catch (e) {
      onSaved((e instanceof Error ? e.message : 'Error al guardar') + '|error')
    }
  }

  const agregarItem = () => append({
    productoId: '', productoNombre: '', presentacion: '',
    cantidad: '1', precioUnitario: '0', precioReferencia: '0', bidonNuevo: false,
  })

  const canEdit = !pedido || ['borrador', 'confirmado', 'en_produccion'].includes(pedido.estado)

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <SheetContent side="right" style={{ width: '100%', maxWidth: 560, overflowY: 'auto' }}>
        <SheetHeader>
          <SheetTitle>
            {pedido
              ? `Pedido P-${String(pedido.numero).padStart(5, '0')}`
              : 'Nuevo pedido'}
          </SheetTitle>
        </SheetHeader>

        {!canEdit && (
          <div style={{
            background: '#FFF3E0', border: '1px solid #F57C00', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, color: '#F57C00', marginTop: 16,
          }}>
            Este pedido está en estado <strong>{pedido?.estado}</strong> y no se puede editar.
          </div>
        )}

        <form style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 20, paddingBottom: 80 }}>

          {/* Cliente */}
          <Controller
            name="clienteId"
            control={control}
            render={({ field, fieldState }) => (
              <SelectorCliente
                value={field.value}
                error={fieldState.error?.message}
                onChange={(id, tipo, dir) => {
                  field.onChange(id)
                  if (id) {
                    setValue('tipoPrecio', tipo)
                    setValue('direccionEntrega', dir)
                  }
                }}
              />
            )}
          />

          {/* Tipo precio */}
          <ButtonGroup
            label="Tipo de precio"
            value={tipoPrecio}
            onChange={v => setValue('tipoPrecio', v as 'minorista' | 'mayorista')}
            options={[
              { value: 'minorista', label: 'Minorista' },
              { value: 'mayorista', label: 'Mayorista', color: '#1B9ED6' },
            ]}
          />

          {/* Fecha + dirección */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FloatInput
              label="Fecha de producción *"
              type="date"
              error={errors.fechaProduccion?.message}
              {...register('fechaProduccion')}
            />
            <FloatInput label="Dirección entrega" {...register('direccionEntrega')} />
          </div>

          {/* Ítems */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A5568' }}>
                Productos *
              </span>
              <button type="button" onClick={agregarItem}
                style={{
                  background: '#E8F4FF', color: '#1B9ED6', border: 'none', borderRadius: 8,
                  padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Plus size={13} /> Producto
              </button>
            </div>

            {errors.items?.root && (
              <p style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.items.root.message}</p>
            )}
            {errors.items?.message && (
              <p style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>{errors.items.message}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fields.length === 0 ? (
                <button type="button" onClick={agregarItem}
                  style={{
                    background: '#F4F6F8', border: '2px dashed #D1D5DB', borderRadius: 12,
                    padding: '20px', cursor: 'pointer', color: '#4A5568',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14,
                  }}>
                  <Package size={18} /> Agregar primer producto
                </button>
              ) : (
                fields.map((field, i) => (
                  <FilaItem
                    key={field.id} index={i}
                    control={control} register={register} watch={watch} setValue={setValue}
                    onRemove={() => remove(i)}
                    tipoPrecio={tipoPrecio}
                    productos={productos ?? []}
                  />
                ))
              )}
            </div>
          </div>

          {/* Notas */}
          <FloatInput label="Notas para producción" {...register('notasProduccion')} />
          <FloatInput label="Notas internas (solo admin)" {...register('notasInternas')} />

          {/* Costo envío + total */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FloatInput label="Costo de envío" {...register('costoEnvio')} inputMode="decimal" />
            <div>
              <FloatInput
                label="Total manual (opcional)"
                {...register('totalManual')}
                inputMode="decimal"
              />
              {totalEditado && (
                <p style={{ fontSize: 11, color: '#F57C00', marginTop: 3 }}>Total editado manualmente</p>
              )}
            </div>
          </div>

          {/* Resumen total */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '14px 16px',
            border: `2px solid ${totalEditado ? '#F57C00' : '#0D5C8A'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 14, color: '#4A5568' }}>
              {totalEditado ? 'Total (manual)' : 'Total calculado'}
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: totalEditado ? '#F57C00' : '#0D5C8A', letterSpacing: -1 }}>
              ${totalMostrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Acciones — fijas al pie */}
          {canEdit && (
            <div style={{
              position: 'sticky', bottom: 0, background: '#F4F6F8',
              paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <button
                type="button"
                onClick={handleSubmit(d => submit(d, 'confirmar'))}
                disabled={saving}
                style={{
                  background: saving ? 'rgba(13,92,138,0.5)' : '#0D5C8A',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '14px', minHeight: 48, fontSize: 15, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
                }}
              >
                {saving ? 'Guardando…' : pedido ? 'Guardar cambios' : '✓ Confirmar pedido → Producción'}
              </button>
              {!pedido && (
                <button
                  type="button"
                  onClick={handleSubmit(d => submit(d, 'borrador'))}
                  disabled={saving}
                  style={{
                    background: 'transparent', color: '#0D5C8A',
                    border: '1.5px solid #0D5C8A', borderRadius: 10,
                    padding: '12px', minHeight: 44, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', width: '100%',
                  }}
                >
                  Guardar borrador
                </button>
              )}
              <button type="button" onClick={handleClose} style={{
                background: 'transparent', color: '#4A5568', border: '1.5px solid #D1D5DB',
                borderRadius: 10, padding: '10px', minHeight: 40, fontSize: 14, cursor: 'pointer',
              }}>
                Cancelar
              </button>
            </div>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
