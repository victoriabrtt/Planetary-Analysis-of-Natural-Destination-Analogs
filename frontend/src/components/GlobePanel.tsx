import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { VERDICTS, verdictOf, type DimKey } from '../engine/dimensions'
import { angularDist, knownSites } from '../engine/fingerprint'
import { useT } from '../i18n'
import { fmtCoord, fmtNum, fmtShare, fmtVal, pctScore } from '../lib/format'
import { placeTitle, rankLabels } from '../lib/labels'
import { listJoin, qualify } from '../lib/verdict'
import { revealAnswer } from '../lib/reveal'
import { spring } from '../lib/motion'
import { useDelayedFlag } from '../lib/useDelayedFlag'
import { resultDims, sourceBodyOf, targetBodyOf, useActiveDim, useCandidate, useStore } from '../store/useStore'
import AnimatedNumber from './AnimatedNumber'
import CoordForm from './CoordForm'
import GlobeView, { type Marker } from './GlobeView'
import VerdictBadge from './VerdictBadge'

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
      <div className="relative z-10 flex flex-col gap-3 px-6 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {/* Un solo h2: lo que se anima es su contenido, así nunca hay dos títulos a la vez. */}
          <h2 className="display text-[26px] hyphens-auto [overflow-wrap:break-word] [text-wrap:balance]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={title}
                className="block"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={spring}
              >
                {title}
              </motion.span>
            </AnimatePresence>
          </h2>
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
  const t = useT()
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const point = useStore((s) => s.point)
  const result = useStore((s) => s.result)
  const select = useStore((s) => s.selectPoint)
  // En pantallas angostas la respuesta queda debajo del globo de origen: después de elegir, se la muestra.
  const selectPoint = useMemo(
    () => (lat: number, lon: number) => {
      select(lat, lon)
      setTimeout(() => revealAnswer(true), 350)
    },
    [select],
  )
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

  const name = activeSite?.name ?? (result?.source.name ? placeTitle(result.source.name, t) : t('source.picked'))
  const bodyName = t(`body.${src}`)

  return (
    <PanelShell
      label={t('source.label', { body: bodyName })}
      title={name}
      reading={`${bodyName} · ${fmtCoord(point.lat, point.lon)}`}
      footer={
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-(--muted)">{t('source.howTo')}</p>
          <ul className="flex flex-wrap gap-1.5" aria-label={t('source.sites', { body: bodyName })}>
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
                  {t('source.showAll', { n: sites.length })}
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
        ariaLabel={t('source.globe', { body: bodyName })}
      />
    </PanelShell>
  )
}

/** El panel destino ES la respuesta: el lugar que se está mirando (el ganador o un puesto del
 *  ranking), su cercanía con el veredicto calificado, qué tan raro es y cómo le va en cada medida. */
export function TargetPanel() {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const result = useStore((s) => s.result)
  const activeDim = useActiveDim()
  const pinnedDim = useStore((s) => s.pinnedDim)
  const setHoveredDim = useStore((s) => s.setHoveredDim)
  const togglePinnedDim = useStore((s) => s.togglePinnedDim)
  const setInspect = useStore((s) => s.setInspect)
  const error = useStore((s) => s.error)
  const nearest = useStore((s) => s.errorNearest)
  const selectPoint = useStore((s) => s.selectPoint)
  const calculating = useDelayedFlag(useStore((s) => s.loading))
  const catalog = useStore((s) => s.dims)
  const lang = useStore((s) => s.lang)
  const cand = useCandidate()
  const dims = useMemo(() => resultDims(catalog, result), [catalog, result])
  const tgt = targetBodyOf(mode, body)
  const qual = result?.overall.qualifying
  const bodyName = t(`body.${tgt}`)
  const bodyThe = t(`the.${tgt}`)

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
    const ms: Marker[] = [{ id: 'origin', lat: result.source.lat, lon: result.source.lon, kind: 'origin', label: t('origin.projected') }]
    for (const [name, g] of groups) {
      if (g.lat === o.lat && g.lon === o.lon) continue
      ms.push({ id: `d-${name}`, lat: g.lat, lon: g.lon, kind: 'dims', label: name, dims: g.dims, colors: g.dims.map(colorOf) })
    }
    ms.push({ id: 'overall', lat: o.lat, lon: o.lon, kind: 'overall', label: placeTitle(o.name, t) })
    return {
      markers: ms,
      arcs: [{ startLat: result.source.lat, startLng: result.source.lon, endLat: o.lat, endLng: o.lon }],
      rings: [{ lat: o.lat, lng: o.lon, color: '#9cc7ff' }],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, dims, cand?.site.lat, cand?.site.lon, lang])

  const o = cand?.site
  // Veredicto calificado (el mismo helper que usa el ranking): el promedio no esconde una medida que se rompe.
  const q = cand ? qualify(cand.score, cand.perDim, dims) : null
  const broken = q ? q.broken.map((d) => d.name.toLowerCase()) : []
  // Análogo común (≥ 5 % de la superficie califica): el título no corona un lugar arbitrario.
  const common = !!cand && cand.rank === 1 && !!qual && qual.share >= 0.05
  const title = o
    ? common
      ? t('target.commonTitle', { body: bodyThe })
      : cand.rank > 1 && result?.ranking
      ? rankLabels(result.ranking, tgt, t)[cand.rank - 1]
      : placeTitle(o.name, t)
    : error
      ? t('target.none')
      : t('target.calculating')

  const rarity = !qual
    ? null
    : qual.count === 0
      ? t('target.rarity.none')
      : qual.count === 1
        ? t('target.rarity.unique')
        : qual.share >= 0.05
          ? t('target.rarity.common', { share: fmtShare(qual.share), body: bodyThe })
          : qual.share < 0.0001
            ? t('target.rarity.rareFew', { n: fmtNum(qual.count), body: bodyThe })
            : t('target.rarity.rare', { n: fmtNum(qual.count), share: fmtShare(qual.share), body: bodyThe })

  return (
    <div id="analogo" tabIndex={-1} className="scroll-mt-4 rounded-[20px]">
      <PanelShell
        label={t('target.label', { body: bodyName })}
        title={title}
        reading={
          calculating
            ? t('target.calculating')
            : o
              ? common
                ? `${t('target.example', { place: placeTitle(o.name, t) })} · ${fmtCoord(o.lat, o.lon)}`
                : `${bodyName} · ${fmtCoord(o.lat, o.lon)}`
              : bodyName
        }
        aside={
          cand && (
            <div className="flex shrink-0 flex-col items-start gap-1.5 sm:max-w-[15rem] sm:items-end sm:text-right">
              <span className="figure text-[40px] leading-none">
                <AnimatedNumber value={pctScore(cand.score)} />
                <span className="text-(--muted)">%</span>
              </span>
              {q?.qualified ? (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-(--line) px-2.5 py-1 text-[14px] font-medium text-(--muted)">
                  {t('target.strongIn', { ok: q.ok, n: q.n })}
                </span>
              ) : (
                <VerdictBadge score={cand.score} size="md" />
              )}
              {broken.length > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[14px] font-medium"
                  style={{ borderColor: `${VERDICTS.broken.color}99`, background: `${VERDICTS.broken.color}1f` }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: VERDICTS.broken.color }} aria-hidden />
                  {t('target.breaksIn', { dims: listJoin(broken, lang) }).replace(/^./, (c) => c.toUpperCase())}
                </span>
              )}
              {cand.rank === 1 && rarity && <span className="text-[13px] text-(--muted)">{rarity}</span>}
            </div>
          )
        }
        footer={
          result &&
          cand && (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-(--muted) sm:hidden" aria-label={t('target.legend')}>
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-(--muted)" aria-hidden /> {t('target.legendOrigin', { body: bodyThe })}
                </li>
                {!!qual?.count && (
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#9cc7ff]" aria-hidden /> {t('target.legendQual')}
                  </li>
                )}
              </ul>
              {cand.rank > 1 && (
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[14px]">
                  <span className="text-(--muted)">{t('target.viewing', { n: cand.rank })}</span>
                  <button onClick={() => setInspect(null)} className="press font-medium text-accent underline-offset-4 hover:underline">
                    {t('target.back')}
                  </button>
                </p>
              )}
              <ul className="grid gap-x-6 sm:grid-cols-2" aria-label={t('target.measures')}>
                {dims.map((d) => {
                  const w = cand.perDim[d.key] ?? result.perDim[d.key]
                  const k = verdictOf(w.score)
                  const on = activeDim === d.key
                  const pinned = pinnedDim === d.key
                  return (
                    <li key={d.key} className={`relative border-b border-(--line) ${pinned ? 'rounded-md bg-(--track)' : ''}`}>
                      <button
                        onMouseEnter={() => setHoveredDim(d.key)}
                        onMouseLeave={() => setHoveredDim(null)}
                        onClick={() => togglePinnedDim(d.key)}
                        aria-pressed={pinnedDim === d.key}
                        className={`press flex w-full items-center justify-between gap-3 py-2 text-left text-[14px] transition-opacity ${
                          activeDim && !on ? 'opacity-50' : ''
                        } ${pinned ? 'pl-2 pr-8 font-medium' : ''}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-[2px] ring-1 ring-(--line-strong)" style={{ background: d.color }} aria-hidden />
                          <span className="truncate">{d.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-(--muted)">
                          <span className="tnum">
                            {t('target.diff')} {fmtVal(d, w.diff)}
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: VERDICTS[k].color }} aria-hidden />
                          <span className="text-(--fg)">{t(`verdict.${k}`)}</span>
                        </span>
                      </button>
                      {pinned && (
                        <button
                          onClick={() => togglePinnedDim(d.key)}
                          aria-label={t('target.unpin', { dim: d.name.toLowerCase() })}
                          className="press absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-(--muted) hover:text-(--fg)"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
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
          highlightDim={activeDim}
          focus={
            o && result
              ? { lat: o.lat, lon: o.lon, altitude: 2.1, key: `${tgt}:${o.name}:${o.lat}:${o.lon}:${result.source.lat}:${result.source.lon}` }
              : undefined
          }
          ariaLabel={o ? t('target.globe', { body: bodyName, place: placeTitle(o.name, t) }) : t('target.globeEmpty', { body: bodyName })}
        />
        {result && (
          <ul className="pointer-events-none absolute bottom-3 left-4 hidden flex-col gap-1 text-[13px] text-(--muted) sm:flex" aria-label={t('target.legend')}>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-(--muted)" aria-hidden />{' '}
              {t('target.legendOrigin', { body: bodyThe })}
            </li>
            {!!qual?.count && (
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#9cc7ff]" aria-hidden /> {t('target.legendQual')}
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
                  {t('target.useNearest')}
                </button>
              )}
            </div>
          </div>
        )}
      </PanelShell>
    </div>
  )
}
