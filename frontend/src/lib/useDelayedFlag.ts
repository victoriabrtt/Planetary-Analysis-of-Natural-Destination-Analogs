import { useEffect, useState } from 'react'

/** true solo si `flag` sigue en true después de `ms`: las consultas rápidas no parpadean. */
export function useDelayedFlag(flag: boolean, ms = 150): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!flag) {
      setShown(false)
      return
    }
    const t = setTimeout(() => setShown(true), ms)
    return () => clearTimeout(t)
  }, [flag, ms])
  return shown
}
