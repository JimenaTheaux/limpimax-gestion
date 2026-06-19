import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Phone, MapPin, FileText, Edit2, Users } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton }         from '@/components/ui/skeleton'
import { FloatInput }       from '@/components/common/FloatInput'
import { ButtonGroup }      from '@/components/common/ButtonGroup'
import { BadgeActivo }      from '@/components/common/BadgeEstado'
import { EmptyState }       from '@/components/common/EmptyState'
import { ToastContainer }   from '@/components/common/ToastContainer'
import { useToast }         from '@/hooks/useToast'
import {
  useClientes, useCrearCliente, useEditarCliente,
} from '@/services/clientes'
import { useDebounce } from '@/hooks/useDebounce'
import type { Cliente } from '@/types'

// ─── Formato CUIT ─────────────────────────────────────────────────────────────

function fmtCuit(cuit: string | null) {
  if (!cuit) return null
  const c = cuit.replace(/\D/g, '')
  if (c.length !== 11) return cuit
  return `${c.slice(0,2)}-${c.slice(2,10)}-${c[10]}`
}

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  nombre:      z.string().min(1, 'El nombre es obligatorio'),
  cuit:        z.string()
                 .regex(/^\d{11}$/, 'Debe tener 11 dígitos sin guiones')
                 .optional()
                 .or(z.literal('')),
  telefono:    z.string().optional(),
  direccion:   z.string().optional(),
  tipocliente: z.enum(['minorista', 'mayorista']),
  notas:       z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Drawer de formulario ─────────────────────────────────────────────────────

interface DrawerProps {
  open:    boolean
  onClose: () => void
  cliente: Cliente | null
  onSaved: (msg: string) => void
}

function ClienteDrawer({ open, onClose, cliente, onSaved }: DrawerProps) {
  const crear  = useCrearCliente()
  const editar = useEditarCliente()
  const saving = crear.isPending || editar.isPending

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:      cliente?.nombre      ?? '',
      cuit:        cliente?.cuit        ?? '',
      telefono:    cliente?.telefono    ?? '',
      direccion:   cliente?.direccion   ?? '',
      tipocliente: cliente?.tipocliente ?? 'minorista',
      notas:       cliente?.notas       ?? '',
    },
  })

  const tipoVal = watch('tipocliente')

  const onSubmit = async (data: FormData) => {
    try {
      if (cliente) {
        await editar.mutateAsync({ id: cliente.id, ...data, cuit: data.cuit || null })
        onSaved('Cliente actualizado correctamente')
      } else {
        await crear.mutateAsync({ ...data, cuit: data.cuit || null })
        onSaved('Cliente creado correctamente')
        reset()
      }
      onClose()
    } catch (e) {
      onSaved((e instanceof Error ? e.message : 'Error al guardar') + '|error')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{cliente ? 'Editar cliente' : 'Nuevo cliente'}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}
        >
          <FloatInput label="Nombre *" error={errors.nombre?.message} {...register('nombre')} />
          <FloatInput label="CUIT/CUIL (11 dígitos sin guiones)" error={errors.cuit?.message} {...register('cuit')} inputMode="numeric" />
          <FloatInput label="Teléfono" {...register('telefono')} type="tel" />
          <FloatInput label="Dirección de entrega" {...register('direccion')} />

          <ButtonGroup
            label="Tipo de cliente *"
            value={tipoVal}
            onChange={v => setValue('tipocliente', v, { shouldValidate: true })}
            error={errors.tipocliente?.message}
            options={[
              { value: 'minorista', label: 'Minorista' },
              { value: 'mayorista', label: 'Mayorista', color: '#1B9ED6' },
            ]}
          />

          <FloatInput label="Observaciones" {...register('notas')} />

          {/* Botones footer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background:     saving ? 'rgba(13,92,138,0.5)' : '#0D5C8A',
                color:          '#fff', border: 'none', borderRadius: 10,
                padding:        '13px 20px', minHeight: 44,
                fontSize:       15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Crear cliente'}
            </button>
            <button
              type="button" onClick={onClose}
              style={{
                background: 'transparent', color: '#0D5C8A',
                border: '1.5px solid #0D5C8A', borderRadius: 10,
                padding: '12px 20px', minHeight: 44,
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Toggle activo — solo en edición */}
        {cliente && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #D1D5DB' }}>
            <button
              onClick={async () => {
                await editar.mutateAsync({ id: cliente.id, activo: !cliente.activo })
                onSaved(`Cliente ${!cliente.activo ? 'activado' : 'desactivado'}`)
                onClose()
              }}
              style={{
                width: '100%', background: cliente.activo ? '#FDECEA' : '#E8F8F0',
                color: cliente.activo ? '#D32F2F' : '#2E9E5C',
                border: `1.5px solid ${cliente.activo ? '#D32F2F' : '#2E9E5C'}`,
                borderRadius: 10, padding: '12px 20px', minHeight: 44,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {cliente.activo ? 'Desactivar cliente' : 'Activar cliente'}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Card de cliente ──────────────────────────────────────────────────────────

function ClienteCard({ cliente, onEdit }: { cliente: Cliente; onEdit: () => void }) {
  return (
    <div
      style={{
        background:   '#fff',
        borderRadius: 20,
        padding:      '16px 20px',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
        borderLeft:   `4px solid ${cliente.tipocliente === 'mayorista' ? '#1B9ED6' : '#4A5568'}`,
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Fila 1: nombre + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#1A2B3C' }}>
            {cliente.nombre}
          </span>
          <BadgeActivo activo={cliente.activo ?? true} />
          <span style={{
            backgroundColor: cliente.tipocliente === 'mayorista' ? '#E8F4FF' : '#F0F0F0',
            color:           cliente.tipocliente === 'mayorista' ? '#1B9ED6' : '#9A9A9A',
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
          }}>
            {cliente.tipocliente.toUpperCase()}
          </span>
        </div>

        {/* Fila 2: CUIT */}
        {cliente.cuit && (
          <p style={{ fontSize: 12, color: '#4A5568', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={12} />
            {fmtCuit(cliente.cuit)}
          </p>
        )}

        {/* Fila 3: teléfono */}
        {cliente.telefono && (
          <p style={{ fontSize: 12, color: '#4A5568', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Phone size={12} />
            {cliente.telefono}
          </p>
        )}

        {/* Fila 4: dirección */}
        {cliente.direccion && (
          <p style={{ fontSize: 12, color: '#4A5568', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} />
            {cliente.direccion}
          </p>
        )}
      </div>

      <button
        onClick={onEdit}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#4A5568', padding: 6, borderRadius: 8,
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}
        title="Editar"
      >
        <Edit2 size={16} />
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [q, setQ]               = useState('')
  const [drawerOpen, setDrawer] = useState(false)
  const [selected, setSelected] = useState<Cliente | null>(null)
  const { toasts, show, dismiss } = useToast()

  const qDebounced = useDebounce(q, 300)
  const { data: clientes, isLoading } = useClientes(qDebounced || undefined)

  const handleEdit = (c: Cliente) => { setSelected(c); setDrawer(true) }
  const handleNew  = ()           => { setSelected(null); setDrawer(true) }
  const handleClose = ()          => { setDrawer(false); setSelected(null) }

  const handleSaved = (msg: string) => {
    if (msg.endsWith('|error')) show(msg.replace('|error', ''), 'error')
    else                        show(msg, 'success')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title">Clientes</h1>
        <button
          onClick={handleNew}
          style={{
            background: '#0D5C8A', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 16px', minHeight: 40,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4A5568' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre o dirección…"
          style={{
            width: '100%', padding: '10px 10px 10px 36px',
            border: '1px solid #D1D5DB', borderRadius: 10,
            fontSize: 14, outline: 0, background: '#fff',
          }}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <Skeleton key={i} style={{ height: 90, borderRadius: 20 }} />)}
        </div>
      ) : !clientes?.length ? (
        <EmptyState
          icon={Users}
          title={q ? 'Sin resultados' : 'No hay clientes aún'}
          message={q ? `No se encontraron clientes para "${q}"` : 'Creá el primer cliente para empezar.'}
          action={
            !q ? (
              <button onClick={handleNew} style={{
                background: '#0D5C8A', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 20px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', minHeight: 44,
              }}>
                + Nuevo cliente
              </button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clientes.map(c => (
            <ClienteCard key={c.id} cliente={c} onEdit={() => handleEdit(c)} />
          ))}
          <p style={{ fontSize: 12, color: '#4A5568', textAlign: 'center', marginTop: 4 }}>
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
      )}

      <ClienteDrawer
        open={drawerOpen}
        onClose={handleClose}
        cliente={selected}
        onSaved={handleSaved}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
