import { NavLink } from 'react-router-dom'
import { IconLogout } from '@tabler/icons-react'
import { useAuth } from '@/hooks/useAuth'

export interface NavItem {
  to:    string
  end?:  boolean
  icon:  React.ReactNode
  label: string
}

function getIniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

interface Props {
  onLogout:   () => void | Promise<void>
  rootPath?:  string
  links?:     NavItem[]
  roleLabel?: string
  extra?:     React.ReactNode
}

export function Navbar({ onLogout, rootPath = '/admin', links = [], roleLabel, extra }: Props) {
  const { usuario } = useAuth()

  return (
    <header
      style={{
        background:  '#1A2B3C',
        height:      52,
        display:     'flex',
        alignItems:  'center',
        padding:     '0 20px',
        position:    'sticky',
        top:         0,
        zIndex:      50,
        width:       '100%',
        flexShrink:  0,
      }}
    >
      {/* Brand */}
      <NavLink
        to={rootPath}
        end
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            8,
          marginRight:    32,
          flexShrink:     0,
          textDecoration: 'none',
        }}
      >
        <img
          src="/logo-mark.png"
          alt="Limpimax"
          width={28}
          height={28}
          fetchPriority="high"
          loading="eager"
          style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'contain', flexShrink: 0 }}
        />
        <span className="hidden md:inline" style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
          Limpimax
        </span>
      </NavLink>

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
          >
            {item.icon}
            <span className="hidden md:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {extra}

        <NavLink
          to={`${rootPath}/perfil`}
          title="Mi perfil"
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <div
            style={{
              width:          26,
              height:         26,
              borderRadius:   '50%',
              background:     '#0D5C8A',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          '#fff',
              fontSize:       11,
              fontWeight:     700,
              flexShrink:     0,
            }}
          >
            {usuario ? getIniciales(usuario.nombre) : 'U'}
          </div>

          <span className="hidden md:inline" style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {usuario?.nombre ?? '—'}
            {roleLabel && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {roleLabel}</span>}
          </span>
        </NavLink>

        <button
          onClick={onLogout}
          title="Cerrar sesión"
          className="navbar-logout-btn"
          style={{
            background:   'transparent',
            border:       'none',
            cursor:       'pointer',
            padding:      4,
            borderRadius: 6,
            display:      'flex',
            alignItems:   'center',
            flexShrink:   0,
          }}
        >
          <IconLogout size={15} />
        </button>
      </div>
    </header>
  )
}
