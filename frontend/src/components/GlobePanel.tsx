import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { BODY_LABEL, type Body } from '../engine/data'
import type { DimKey } from '../engine/dimensions'
import { angularDist, knownSites } from '../engine/fingerprint'
import { fmtCoord, pct } from '../lib/format'
import { spring } from '../lib/motion'
import { resultDims, sourceBodyOf, targetBodyOf, useStore } from '../store/useStore'
import GlobeView, { type Marker } from './GlobeView'
import { CursorIcon } from './Icons'

function PanelShell({ kicker, title, body, right, children, footer }: {
  kicker: string
  title: string
  body: Body
  right?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const tint = body === 'mars' ? 'rgb(255 120 70 / 0.10)' : body === 'earth' ? 'rgb(57 135 229 / 0.12)' : 'rgb(200 210 235 / 0.07)'
  return (
    <section className="glass flex flex-col overflow-hidden" aria-label={`${kicker}: ${title}`}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 55% at 50% 52%, ${tint}, transparent 70%)` }} />
      <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <div className="kicker">{kicker}</div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h2
              key={title}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={spring}
              className="text-2xl font-semibold tracking-[-0.03em]"
            >
              {title}
            </motion.h2>
          </AnimatePresence>
        </div>
        {right}
      </div>
      <div className="relative h-[340px] sm:h-[420px] lg:h-[480px]">{children}</div>
      {footer && <div className="relative z-10 px-4 pb-4">{footer}</div>}
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

  const name = result?.source.name ?? fmtCoord(point.lat, point.lon)

  return (
    <PanelShell
      kicker="Origen"
      title={BODY_LABEL[src]}
      body={src}
      right={
        <div className="text-right">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring}
              className="text-sm font-semibold tracking-[-0.01em]"
            >
              {name}
            </motion.div>
          </AnimatePresence>
          <div className="tnum text-xs text-(--faint)">{fmtCoord(point.lat, point.lon)}</div>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-(--faint)">
            <CursorIcon width={13} height={13} /> Hacé clic en cualquier punto del globo, o elegí un atajo
          </div>
          <ul className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" aria-label="Lugares famosos">
            {sites.map((s) => {
              const active = activeSite?.name === s.name
              return (
                <li key={s.name} className="shrink-0">
                <button
                  aria-pressed={active}
                  onClick={() => selectPoint(s.lat, s.lon)}
                  className={`press relative shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium tracking-[-0.01em] transition-colors ${
                    active ? 'border-transparent text-white' : 'border-(--line) text-(--muted) hover:border-(--line-strong) hover:text-(--fg)'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="chip-active"
                      transition={spring}
                      className="absolute inset-0 -z-0 rounded-full bg-accent/90 shadow-[0_6px_18px_-6px_rgb(57_135_229/0.9)]"
                    />
                  )}
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

export function TargetPanel() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const result = useStore((s) => s.result)
  const hoveredDim = useStore((s) => s.hoveredDim)
  const catalog = useStore((s) => s.dims)
  const dims = useMemo(() => resultDims(catalog, result), [catalog, result])
  const tgt = targetBodyOf(mode, body)

  const { markers, arcs, rings } = useMemo(() => {
    if (!result) return { markers: [] as Marker[], arcs: [], rings: [] }
    const o = result.overall.site
    // Agrupar "mejor por dimensión" por sitio
    const groups = new Map<string, { lat: number; lon: number; dims: DimKey[] }>()
    const colorOf = (k: DimKey) => dims.find((d) => d.key === k)?.color ?? '#fff'
    for (const d of dims) {
      const s = result.perDim[d.key].site
      const g = groups.get(s.name) ?? { lat: s.lat, lon: s.lon, dims: [] }
      g.dims.push(d.key)
      groups.set(s.name, g)
    }
    const overallDims = groups.get(o.name)?.dims ?? []
    const ms: Marker[] = [
      {
        id: 'origin',
        lat: result.source.lat,
        lon: result.source.lon,
        kind: 'origin',
        label: 'Origen proyectado',
      },
    ]
    for (const [name, g] of groups) {
      if (name === o.name) continue
      ms.push({
        id: `d-${name}`,
        lat: g.lat,
        lon: g.lon,
        kind: 'dims',
        label: name,
        dims: g.dims,
        colors: g.dims.map(colorOf),
      })
    }
    ms.push({
      id: 'overall',
      lat: o.lat,
      lon: o.lon,
      kind: 'overall',
      label: o.name,
      sub: `${pct(result.overall.score)}%`,
      dims: overallDims,
      colors: overallDims.map(colorOf),
    })
    return {
      markers: ms,
      arcs: [{ startLat: result.source.lat, startLng: result.source.lon, endLat: o.lat, endLng: o.lon }],
      rings: [{ lat: o.lat, lng: o.lon, color: '#9cc7ff' }],
    }
  }, [result, dims])

  const o = result?.overall.site

  return (
    <PanelShell
      kicker="Análogo más cercano en"
      title={BODY_LABEL[tgt]}
      body={tgt}
      right={
        o && (
          <div className="text-right">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={o.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={spring}
                className="text-sm font-semibold tracking-[-0.01em]"
              >
                {o.name}
              </motion.div>
            </AnimatePresence>
            <div className="tnum text-xs text-(--faint)">{fmtCoord(o.lat, o.lon)}</div>
          </div>
        )
      }
      footer={
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-(--muted)" aria-label="Leyenda de marcadores">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-accent" /> Global
          </li>
          {dims.map((d) => (
            <li
              key={d.key}
              className={`flex items-center gap-1.5 transition-opacity ${hoveredDim && hoveredDim !== d.key ? 'opacity-40' : ''}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
              {d.short}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-(--muted)" /> Origen proyectado
          </li>
        </ul>
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
          o && result
            ? {
                lat: o.lat,
                lon: o.lon,
                altitude: 2.1,
                key: `${tgt}:${o.name}:${result.source.lat}:${result.source.lon}`,
              }
            : undefined
        }
        ariaLabel={o ? `Globo de ${BODY_LABEL[tgt]} con el análogo global en ${o.name}.` : `Globo de ${BODY_LABEL[tgt]}`}
      />
    </PanelShell>
  )
}
