import React from 'react'
import { NavLink } from 'react-router-dom'

type NavIcon = React.ComponentType<{
  size?:      number
  color?:     string
  className?: string
  style?:     React.CSSProperties
}>

interface NavItem {
  to:        string
  icon:      NavIcon
  label:     string
  end?:      boolean
  prefetch?: () => void
}

interface Props {
  items: NavItem[]
}

export function BottomNav({ items }: Props) {
  return (
    <nav
      style={{
        position:       'fixed',
        bottom:         0,
        left:           0,
        right:          0,
        height:         56,
        background:     '#fff',
        borderTop:      '0.5px solid #D1D5DB',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-around',
        zIndex:         100,
        paddingBottom:  'env(safe-area-inset-bottom)',
      }}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onTouchStart={item.prefetch}
            onMouseEnter={item.prefetch}
            style={({ isActive }) => ({
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            3,
              textDecoration: 'none',
              color:          isActive ? '#0D5C8A' : '#9A9A9A',
              minWidth:       48,
              padding:        '4px 8px',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} color={isActive ? '#0D5C8A' : '#9A9A9A'} />
                <span style={{ fontSize: 10, fontWeight: 400, color: isActive ? '#0D5C8A' : '#9A9A9A' }}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
