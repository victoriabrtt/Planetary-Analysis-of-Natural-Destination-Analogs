import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, type ReactNode } from 'react'
import { BODY_LABEL } from '../engine/data'
import { VERDICTS, verdictOf, type DimKey } from '../engine/dimensions'
import { angularDist, knownSites } from '../engine/fingerprint'
import { fmtCoord, fmtVal, pct, placeTitle } from '../lib/format'
import { spring } from '../lib/motion'
import { resultDims, sourceBodyOf, targetBodyOf, useStore } from '../store/useStore'
import AnimatedNumber from './AnimatedNumber'
import GlobeView, { type Marker } from './GlobeView'
import VerdictBadge from './VerdictBadge'
import { useDelayedFlag } from '../lib/useDelayedFlag'

/** Panel de instrumento: el título es el lugar; debajo, el cuerpo y las coordenadas como lectura. */
function PanelShell({ title, reading, aside, children, footer, label }: {
  title: string
  reading: string
  aside?: ReactNode
  children: ReactNode
  footer?: ReactNode
  label: string
}) {
  return (
    <section className="card flex flex-col overflow-hidden" aria-label={label}>
      <div className="relative z-10 flex items-start justify-between gap-4 px-6 pt-5">
        <div className="min-w-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h2
              key={title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring}
              className="display text-[26px] [overflow-wrap:anywhere] [text-wrap:balance]"
            >
              {title}
            </motion.h2>
          </AnimatePresence>
          <p className="tnum mt-1 text-[13px] text-(--muted)">{reading}</p>
        </div>
        {aside}
      </div>
      <div className="relative h-[340px] sm:h-[400px] lg:h-[440px]">{children}</div>
      {footer && <div className="relative z-10 border-t border-(--line) px-6 py-4">{footer}</div>}
    </section>
  )
}

export function SourcePanel() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const point = useStore((s) => s.point)
  const result = useStore((s) => s.result)
  const selectPoint = useStore((s) => s.selectPoint)
  const src = sourceBodyOf(mode, body)
  const sites = knownSites(src)
  const activeSite = sites.find((s) => angularDist(s.lat, s.lon, point.lat, point.lon) < 0.01)

  const markers = useMemo<Marker[]>(
    () => [
      ...sites.map((s) => ({
        id: `f-${src}-${s.name}`,
        lat: s.lat,
        lon: s.lon,
        kind: 'famous' as const,
        label: s.name,
        onClick: () => selectPoint(s.lat, s.lon),
      })),
      { id: 'selected', lat: point.lat, lon: point.lon, kind: 'selected' as const },
    ],
    [sites, src, point, selectPoint],
  )

  const name = activeSite?.name ?? (result?.source.name ? placeTitle(result.source.name) : 'Punto elegido')

  return (
    <PanelShell
      label={`Origen en ${BODY_LABEL[src]}`}
      title={name}
      reading={`${BODY_LABEL[src]} · ${fmtCoord(point.lat, point.lon)}`}
      footer={
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-(--muted)">Hacé clic en cualquier punto del globo o elegí un sitio conocido.</p>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Sitios conocidos de ${BODY_LABEL[src]}`}>
            {sites.map((s) => {
              const active = activeSite?.name === s.name
              return (
                <li key={s.name}>
                  <button
                    aria-pressed={active}
                    onClick={() => selectPoint(s.lat, s.lon)}
                    className={`press relative rounded-md border px-3 py-1.5 text-[14px] font-medium transition-colors ${
                      active ? 'border-transparent text-(--bg)' : 'border-(--line) text-(--muted) hover:border-(--line-strong) hover:text-(--fg)'
                    }`}
                  >
                    {active && <motion.span layoutId="chip-active" transition={spring} className="absolute inset-0 rounded-md bg-(--fg)" />}
                    <span className="relative">{s.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      }
    >
      <GlobeView
        key={src}
        body={src}
        markers={markers}
        rings={[{ lat: point.lat, lng: point.lon, color: '#3987e5' }]}
        focus={{ lat: point.lat, lon: point.lon, altitude: 1.8, key: `${src}:${point.lat}:${point.lon}` }}
        onPick={(lat, lon) => selectPoint(lat, lon)}
        ariaLabel={`Globo de ${BODY_LABEL[src]}. Hacé clic para elegir un punto de origen.`}
      />
    </PanelShell>
  )
}

/** El panel destino ES la respuesta: el lugar, la cercanía y cómo le va en cada medida. */
export function TargetPanel() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const result = useStore((s) => s.result)
  const hoveredDim = useStore((s) => s.hoveredDim)
  const setHoveredDim = useStore((s) => s.setHoveredDim)
  const inspect = useStore((s) => s.inspect)
  const error = useStore((s) => s.error)
  const nearest = useStore((s) => s.errorNearest)
  const selectPoint = useStore((s) => s.selectPoint)
  const calculating = useDelayedFlag(useStore((s) => s.loading))
  const catalog = useStore((s) => s.dims)
  const dims = useMemo(() => resultDims(catalog, result), [catalog, result])
  const tgt = targetBodyOf(mode, body)

  const { markers, arcs, rings } = useMemo(() => {
    if (!result) return { markers: [] as Marker[], arcs: [], rings: [] }
    const o = result.overall.site
    const groups = new Map<string, { lat: number; lon: number; dims: DimKey[] }>()
    const colorOf = (k: DimKey) => dims.find((d) => d.key === k)?.color ?? '#fff'
    for (const d of dims) {
      const s = result.perDim[d.key].site
      const g = groups.get(s.name) ?? { lat: s.lat, lon: s.lon, dims: [] }
      g.dims.push(d.key)
      groups.set(s.name, g)
    }
    const ms: Marker[] = [{ id: 'origin', lat: result.source.lat, lon: result.source.lon, kind: 'origin', label: 'Origen proyectado' }]
    for (const [name, g] of groups) {
      if (name === o.name) continue
      ms.push({ id: `d-${name}`, lat: g.lat, lon: g.lon, kind: 'dims', label: name, dims: g.dims, colors: g.dims.map(colorOf) })
    }
    ms.push({ id: 'overall', lat: o.lat, lon: o.lon, kind: 'overall', label: o.name })
    if (inspect && (inspect.lat !== o.lat || inspect.lon !== o.lon)) {
      ms.push({ id: 'inspect', lat: inspect.lat, lon: inspect.lon, kind: 'famous', label: inspect.name })
    }
    return {
      markers: ms,
      arcs: [{ startLat: result.source.lat, startLng: result.source.lon, endLat: o.lat, endLng: o.lon }],
      rings: [{ lat: o.lat, lng: o.lon, color: '#9cc7ff' }],
    }
  }, [result, dims, inspect])

  const o = result?.overall.site
  const focusSite = inspect ?? o

  return (
    <PanelShell
      label={`Análogo en ${BODY_LABEL[tgt]}`}
      title={o ? placeTitle(o.name) : error ? 'Sin análogo para ese punto' : 'Calculando…'}
      reading={calculating ? 'Calculando…' : o ? `${BODY_LABEL[tgt]} · ${fmtCoord(o.lat, o.lon)}` : BODY_LABEL[tgt]}
      aside={
        result && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="figure text-[40px] leading-none">
              <AnimatedNumber value={pct(result.overall.score)} />
              <span className="text-(--muted)">%</span>
            </span>
            <VerdictBadge score={result.overall.score} />
          </div>
        )
      }
      footer={
        result && (
          <ul className="grid gap-x-6 sm:grid-cols-2" aria-label="Cómo se compara en cada medida">
            {dims.map((d) => {
              const best = result.perDim[d.key]
              const w = result.overall.perDim?.[d.key] ?? { match: best.match, diff: best.diff, score: best.score }
              const v = VERDICTS[verdictOf(w.score)]
              return (
                <li
                  key={d.key}
                  onMouseEnter={() => setHoveredDim(d.key)}
                  onMouseLeave={() => setHoveredDim(null)}
                  className={`flex items-center justify-between gap-3 border-b border-(--line) py-2 text-[14px] transition-opacity ${
                    hoveredDim && hoveredDim !== d.key ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-(--muted)">
                    <span className="tnum">Δ {fmtVal(d, w.diff)}</span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.color }} aria-hidden />
                    <span className="text-(--fg)">{v.label}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )
      }
    >
      <GlobeView
        key={tgt}
        body={tgt}
        markers={markers}
        arcs={arcs}
        rings={rings}
        highlightDim={hoveredDim}
        focus={
          focusSite && result
            ? { lat: focusSite.lat, lon: focusSite.lon, altitude: 2.1, key: `${tgt}:${focusSite.name}:${result.source.lat}:${result.source.lon}` }
            : undefined
        }
        ariaLabel={o ? `Globo de ${BODY_LABEL[tgt]} con el análogo en ${o.name}.` : `Globo de ${BODY_LABEL[tgt]}`}
      />
      {error && !result && (
        <div role="alert" className="absolute inset-0 z-20 grid place-items-center bg-(--card)/85 p-8">
          <div className="max-w-[26rem] text-center">
            <p className="text-[17px] leading-relaxed [text-wrap:pretty]">{error}</p>
            {nearest && (
              <button
                onClick={() => selectPoint(nearest.lat, nearest.lon)}
                className="press mt-5 rounded-lg bg-accent px-4 py-2.5 text-[15px] font-medium text-(--accent-ink) transition-[filter] hover:brightness-110"
              >
                Usar el punto con datos más cercano
              </button>
            )}
          </div>
        </div>
      )}
    </PanelShell>
  )
}
