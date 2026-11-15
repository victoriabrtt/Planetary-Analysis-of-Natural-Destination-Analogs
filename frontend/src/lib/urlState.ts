// El estado de la consulta vive en la URL (#m=forward&b=moon&lat=..&lon=..&p=rover):
//  - el enlace se puede compartir y abre exactamente la misma consulta;
//  - el botón "atrás" del navegador deshace el último punto elegido.
import { useStore, type Mode, type OffBody } from '../store/useStore'

interface UrlQuery {
  mode: Mode
  body: OffBody
  lat: number
  lon: number
  profileId: string
  lang: 'es' | 'en'
  inspect: number | null
}

function read(): Partial<UrlQuery> {
  const h = new URLSearchParams(window.location.hash.slice(1))
  const num = (k: string) => {
    const v = Number(h.get(k))
    return h.has(k) && Number.isFinite(v) ? v : undefined
  }
  const m = h.get('m')
  const b = h.get('b')
  const lat = num('lat')
  const lon = num('lon')
  return {
    mode: m === 'forward' || m === 'inverse' ? m : undefined,
    body: b === 'moon' || b === 'mars' ? b : undefined,
    lat: lat != null && Math.abs(lat) <= 90 ? lat : undefined,
    lon: lon != null && Math.abs(lon) <= 180 ? lon : undefined,
    profileId: h.get('p') ?? undefined,
    lang: h.get('l') === 'en' || h.get('l') === 'es' ? (h.get('l') as 'es' | 'en') : undefined,
    inspect: num('i') != null ? Math.round(num('i')!) - 1 : null,
  }
}

function write(q: UrlQuery, push: boolean) {
  const hash = `#m=${q.mode}&b=${q.body}&lat=${q.lat.toFixed(3)}&lon=${q.lon.toFixed(3)}&p=${q.profileId}&l=${q.lang}${q.inspect ? `&i=${q.inspect + 1}` : ''}`
  if (hash === window.location.hash) return
  if (push) window.history.pushState(null, '', hash)
  else window.history.replaceState(null, '', hash)
}

/** Aplica la URL al store (antes del primer cálculo) y mantiene la URL sincronizada. */
export function startUrlSync() {
  const q = read()
  const s = useStore.getState()
  useStore.setState({
    mode: q.mode ?? s.mode,
    body: q.body ?? s.body,
    point: q.lat != null && q.lon != null ? { lat: q.lat, lon: q.lon } : s.point,
    profileId: q.profileId ?? s.profileId,
    lang: q.lang ?? s.lang,
    pendingInspect: q.inspect ?? null,
  })

  let applying = false
  const snapshot = (): UrlQuery => {
    const st = useStore.getState()
    return {
      mode: st.mode,
      body: st.body,
      lat: st.point.lat,
      lon: st.point.lon,
      profileId: st.profileId,
      lang: st.lang,
      // Mientras el resultado no llega, el candidato pedido por la URL sigue pendiente: no se pierde.
      inspect: st.inspectIdx ?? st.pendingInspect,
    }
  }
  write(snapshot(), false)

  const unsub = useStore.subscribe((st, prev) => {
    if (applying) return
    const moved = st.point !== prev.point || st.mode !== prev.mode || st.body !== prev.body
    if (moved || st.profileId !== prev.profileId || st.lang !== prev.lang || st.inspectIdx !== prev.inspectIdx || st.pendingInspect !== prev.pendingInspect)
      write(snapshot(), moved)
  })

  const onPop = () => {
    const r = read()
    const st = useStore.getState()
    const langChanged = r.lang != null && r.lang !== st.lang
    applying = true
    useStore.setState({
      mode: r.mode ?? st.mode,
      body: r.body ?? st.body,
      point: r.lat != null && r.lon != null ? { lat: r.lat, lon: r.lon } : st.point,
      profileId: r.profileId ?? st.profileId,
      lang: r.lang ?? st.lang,
      pendingInspect: r.inspect ?? null,
    })
    applying = false
    // Si cambió el idioma, init vuelve a leer la meta (nombres de medidas y perfiles) antes de calcular.
    void (langChanged ? useStore.getState().init() : useStore.getState().run())
  }
  window.addEventListener('popstate', onPop)
  return () => {
    unsub()
    window.removeEventListener('popstate', onPop)
  }
}
