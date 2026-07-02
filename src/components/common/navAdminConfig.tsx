import {
  IconLayoutDashboard, IconFileText, IconUsers, IconPackage,
  IconReceipt, IconUsersGroup,
} from '@tabler/icons-react'
import type { NavItem } from './Navbar'

export const NAV_ADMIN: NavItem[] = [
  { to: '/admin',           end: true, icon: <IconLayoutDashboard size={15} />, label: 'Dashboard' },
  { to: '/admin/pedidos',              icon: <IconFileText        size={15} />, label: 'Pedidos' },
  { to: '/admin/clientes',             icon: <IconUsers           size={15} />, label: 'Clientes' },
  { to: '/admin/productos',            icon: <IconPackage         size={15} />, label: 'Productos' },
  { to: '/admin/egresos',              icon: <IconReceipt         size={15} />, label: 'Egresos' },
  { to: '/admin/usuarios',             icon: <IconUsersGroup      size={15} />, label: 'Usuarios' },
]
