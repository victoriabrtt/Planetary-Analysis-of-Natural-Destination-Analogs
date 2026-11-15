/** Trae el panel de la respuesta a la vista si no se ve (en mobile queda debajo del globo de origen;
 *  en desktop, el ranking queda debajo del panel). Respeta prefers-reduced-motion. */
export function revealAnswer(onlyNarrow = false) {
  if (onlyNarrow && !window.matchMedia('(max-width: 1023px)').matches) return
  const el = document.getElementById('analogo')
  if (!el) return
  const r = el.getBoundingClientRect()
  const visible = r.top >= 0 && r.top < window.innerHeight * 0.35
  if (visible) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
