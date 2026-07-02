import { IconBuildingFactory2, IconListCheck } from '@tabler/icons-react'
import type { NavItem } from './Navbar'

export const NAV_PRODUCCION: NavItem[] = [
  { to: '/produccion',        end: true, icon: <IconBuildingFactory2 size={15} />, label: 'Producción' },
  { to: '/produccion/listos',            icon: <IconListCheck        size={15} />, label: 'Listos' },
]
