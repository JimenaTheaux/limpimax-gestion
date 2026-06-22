import { useIsFetching } from '@tanstack/react-query'

// Barra de progreso de 2px en el top — visible solo cuando hay fetches activos
// No bloquea la UI, el usuario sigue viendo los datos anteriores
export function FetchingBar() {
  const isFetching = useIsFetching()
  if (!isFetching) return null
  return (
    <div
      aria-hidden="true"
      style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        height:         2,
        zIndex:         9999,
        background:     '#1B9ED6',
        pointerEvents:  'none',
        animation:      'fetching-progress 1.2s ease infinite',
      }}
    />
  )
}
