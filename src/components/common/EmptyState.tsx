import type { LucideIcon } from 'lucide-react'

interface Props {
  icon:    LucideIcon
  title:   string
  message?: string
  action?:  React.ReactNode
}

export function EmptyState({ icon: Icon, title, message, action }: Props) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      gap:           12,
      padding:       '48px 24px',
      background:    '#fff',
      borderRadius:  20,
      boxShadow:     '0 2px 8px rgba(0,0,0,0.06)',
      textAlign:     'center',
    }}>
      <Icon size={48} strokeWidth={1.2} color="#D1D5DB" />
      <p style={{ fontWeight: 600, fontSize: 15, color: '#1A2B3C', margin: 0 }}>{title}</p>
      {message && <p style={{ fontSize: 13, color: '#4A5568', margin: 0 }}>{message}</p>}
      {action}
    </div>
  )
}
