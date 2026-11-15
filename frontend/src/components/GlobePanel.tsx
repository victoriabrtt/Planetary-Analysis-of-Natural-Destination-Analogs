import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BODY_LABEL, BODY_THE } from '../engine/data'
import { VERDICTS, verdictOf, type DimKey } from '../engine/dimensions'
import { angularDist, knownSites } from '../engine/fingerprint'
import { fmtCoord, fmtNum, fmtShare, fmtVal, pctScore, placeTitle } from '../lib/format'
import { spring } from '../lib/motion'
import { resultDims, sourceBodyOf, targetBodyOf, useCandidate, useStore } from '../store/useStore'
import AnimatedNumber from './AnimatedNumber'
import GlobeView, { type Marker } from './GlobeView'
import CoordForm from './CoordForm'
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
      <div className="relative h-[280px] sm:h-[400px] lg:h-[440px]">{children}</div>
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
  // Con muchos sitios (15 en la Tierra) se muestran 6 y el resto a pedido: menos opciones a la vez.
  const [showAll, setShowAll] = useState(false)
  useEffect(() => setShowAll(false), [src])
  const VISIBLE = 6
  const shown = showAll || sites.length <= VISIBLE + 2 ? sites : sites.slice(0, VISIBLE)

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
          <p className="text-[14px] text-(--muted)">Hacé clic en cualquier punto del globo, elegí un sitio conocido o escribí coordenadas.</p>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Sitios conocidos de ${BODY_LABEL[src]}`}>
            {shown.map((s) => {
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
            {shown.length < sites.length && (
              <li>
                <button
                  onClick={() => setShowAll(true)}
                  className="press rounded-md px-3 py-1.5 text-[14px] font-medium text-accent underline-offset-4 hover:underline"
                >
                  Ver los {sites.length} sitios
                </button>
              </li>
            )}
          </ul>
          <CoordForm />
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

/** El panel destino ES la respuesta: el lugar que se está mirando (el ganador o un puesto del
 *  ranking), su cercanía, cómo le va en cada medida y cuánta Tierra califica igual de bien. */
export function TargetPanel() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const result = useStore((s) => s.result)
  const hoveredDim = useStore((s) => s.hoveredDim)
  const setHoveredDim = useStore((s) => s.setHoveredDim)
  const setInspect = useStore((s) => s.setInspect)
  const error = useStore((s) => s.error)
  const nearest = useStore((s) => s.errorNearest)
  const selectPoint = useStore((s) => s.selectPoint)
  const calculating = useDelayedFlag(useStore((s) => s.loading))
  const catalog = useStore((s) => s.dims)
  const cand = useCandidate()
  const dims = useMemo(() => resultDims(catalog, result), [catalog, result])
  const tgt = targetBodyOf(mode, body)
  const qual = result?.overall.qualifying

  const { markers, arcs, rings } = useMemo(() => {
    if (!result || !cand) return { markers: [] as Marker[], arcs: [], rings: [] }
    const o = cand.site
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
      if (g.lat === o.lat && g.lon === o.lon) continue
      ms.push({ id: `d-${name}`, lat: g.lat, lon: g.lon, kind: 'dims', label: name, dims: g.dims, colors: g.dims.map(colorOf) })
    }
    ms.push({ id: 'overall', lat: o.lat, lon: o.lon, kind: 'overall', label: o.name })
    return {
      markers: ms,
      arcs: [{ startLat: result.source.lat, startLng: result.source.lon, endLat: o.lat, endLng: o.lon }],
      rings: [{ lat: o.lat, lng: o.lon, color: '#9cc7ff' }],
    }
  }, [result, dims, cand])

  const o = cand?.site
  const toggleDim = (k: DimKey) => setHoveredDim(hoveredDim === k ? null : k)

  return (
    <div id="analogo" tabIndex={-1} className="scroll-mt-4 rounded-[20px]">
      <PanelShell
        label={`Análogo en ${BODY_LABEL[tgt]}`}
        title={o ? placeTitle(o.name) : error ? 'Sin análogo para ese punto' : 'Calculando…'}
        reading={calculating ? 'Calculando…' : o ? `${BODY_LABEL[tgt]} · ${fmtCoord(o.lat, o.lon)}` : BODY_LABEL[tgt]}
        aside={
          cand && (
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="figure text-[40px] leading-none">
                <AnimatedNumber value={pctScore(cand.score)} />
                <span className="text-(--muted)">%</span>
              </span>
              <VerdictBadge score={cand.score} />
            </div>
          )
        }
        footer={
          result &&
          cand && (
            <div className="flex flex-col gap-3">
              {cand.rank > 1 ? (
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[14px]">
                  <span className="text-(--muted)">Estás viendo el puesto {cand.rank} del ranking.</span>
                  <button onClick={() => setInspect(null)} className="press font-medium text-accent underline-offset-4 hover:underline">
                    Volver al más parecido
                  </button>
                </p>
              ) : (
                qual && (
                  <p className="text-[14px] text-(--muted)">
                    {qual.count === 0 ? (
                      <>Ningún otro lugar de {BODY_THE[tgt]} llega a «Fuerte».</>
                    ) : (
                      <>
                        <span className="tnum text-(--fg)">{fmtNum(qual.count)}</span> {qual.count === 1 ? 'celda califica' : 'celdas califican'}{' '}
                        como análogo fuerte: <span className="tnum text-(--fg)">{fmtShare(qual.share)}</span> de {BODY_THE[tgt]}. Son los
                        puntos celestes del globo.
                      </>
                    )}
                  </p>
                )
              )}
              <ul className="grid gap-x-6 sm:grid-cols-2" aria-label="Cómo se compara en cada medida">
                {dims.map((d) => {
                  const w = cand.perDim[d.key] ?? result.perDim[d.key]
                  const v = VERDICTS[verdictOf(w.score)]
                  const on = hoveredDim === d.key
                  return (
                    <li key={d.key} className="border-b border-(--line)">
                      <button
                        onMouseEnter={() => setHoveredDim(d.key)}
                        onMouseLeave={() => setHoveredDim(null)}
                        onClick={() => toggleDim(d.key)}
                        aria-pressed={on}
                        className={`press flex w-full items-center justify-between gap-3 py-2 text-left text-[14px] transition-opacity ${
                          hoveredDim && !on ? 'opacity-50' : ''
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
                          <span className="truncate">{d.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-(--muted)">
                          <span className="tnum">dif. {fmtVal(d, w.diff)}</span>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.color }} aria-hidden />
                          <span className="text-(--fg)">{v.label}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        }
      >
        <GlobeView
          key={tgt}
          body={tgt}
          markers={markers}
          arcs={arcs}
          rings={rings}
          dots={qual?.sample}
          highlightDim={hoveredDim}
          focus={
            o && result
              ? { lat: o.lat, lon: o.lon, altitude: 2.1, key: `${tgt}:${o.name}:${o.lat}:${o.lon}:${result.source.lat}:${result.source.lon}` }
              : undefined
          }
          ariaLabel={o ? `Globo de ${BODY_LABEL[tgt]} con el análogo en ${o.name}.` : `Globo de ${BODY_LABEL[tgt]}`}
        />
        {result && (
          <ul className="pointer-events-none absolute bottom-3 left-4 flex flex-col gap-1 text-[13px] text-(--muted)" aria-label="Leyenda del globo">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-(--muted)" aria-hidden /> Origen proyectado sobre {BODY_THE[tgt]}
            </li>
            {!!qual?.count && (
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#9cc7ff]" aria-hidden /> Califican como análogo fuerte
              </li>
            )}
          </ul>
        )}
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
    </div>
  )
}
