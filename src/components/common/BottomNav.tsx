import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to:    string
  icon:  LucideIcon
  label: string
  end?:  boolean
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
        borderTop:      '1px solid #D1D5DB',
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
            style={({ isActive }) => ({
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            3,
              textDecoration: 'none',
              color:          isActive ? '#0D5C8A' : '#4A5568',
              minWidth:       48,
              padding:        '4px 8px',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
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
