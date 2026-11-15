import { motion } from 'framer-motion'
import type { DimMatch } from '../api/types'
import { VERDICTS, verdictOf, type Dimension } from '../engine/dimensions'
import { fmtCoord, fmtVal, pct } from '../lib/format'
import { valueSpring } from '../lib/motion'
import { useStore } from '../store/useStore'
import VerdictBadge from './VerdictBadge'

interface Props {
  dim: Dimension
  /** El mejor análogo de esta dimensión sola (contrato perDim). */
  best: DimMatch
  /** Cómo le va al ganador global en esta dimensión (lo principal de la card). */
  winner: { match: number; diff: number; score: number }
  sourceName: string
  winnerName: string
  weight: number
}

/** Escala de instrumento: el valor de origen, su banda de tolerancia y el valor del ganador. */
function Scale({ dim, src, match }: { dim: Dimension; src: number; match: number }) {
  const lo = Math.min(dim.range[0], src - dim.tol, match)
  // Extremo superior redondeado a un valor limpio (40°, 600 m, 3.000 m), con un poco de aire.
  const raw = Math.max(dim.range[1], src + dim.tol, match) * 1.04
  const step = 10 ** Math.floor(Math.log10(raw)) / 5
  // Tope físico: la iluminación no pasa de 90° ni el índice de cuevas de 1.
  const cap = dim.key === 'illum' ? 90 : dim.key === 'caves' ? 1 : Infinity
  const hi = Math.max(Math.min(Math.ceil(raw / step) * step, cap), src, match)
  const x = (v: number) => `${((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100}%`
  const bandL = Math.max(src - dim.tol, lo)
  const bandR = Math.min(src + dim.tol, hi)
  return (
    <div className="mt-5" aria-hidden>
    <div className="relative h-7">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-(--line-strong)" />
      <motion.div
        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-(--track) ring-1 ring-(--line-strong) ring-inset"
        initial={false}
        animate={{ left: x(bandL), width: `calc(${x(bandR)} - ${x(bandL)})` }}
        transition={valueSpring}
      />
      <motion.div
        className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--fg)"
        initial={false}
        animate={{ left: x(src) }}
        transition={valueSpring}
      />
      <motion.div
        className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-(--card)"
        style={{ background: dim.color }}
        initial={false}
        animate={{ left: x(match) }}
        transition={valueSpring}
      />
    </div>
    <div className="tnum flex justify-between text-[13px] text-(--muted)">
      <span>{fmtVal(dim, Math.max(lo, 0))}</span>
      <span>{fmtVal(dim, hi)}</span>
    </div>
    </div>
  )
}

/** Una card por dimensión. Responde primero "¿cómo le va al lugar elegido en esta medida?";
 *  el mejor lugar para esta medida sola queda como dato secundario. No es un link: al pasar el
 *  mouse resalta sus marcadores en el globo. */
export default function DimensionCard({ dim, best, winner, sourceName, winnerName, weight }: Props) {
  const setHoveredDim = useStore((s) => s.setHoveredDim)
  const hoveredDim = useStore((s) => s.hoveredDim)
  const v = VERDICTS[verdictOf(winner.score)]
  const tol = best.tol ?? dim.tol
  const otherBest = best.site.name !== winnerName

  return (
    <article
      onMouseEnter={() => setHoveredDim(dim.key)}
      onMouseLeave={() => setHoveredDim(null)}
      onClick={() => setHoveredDim(hoveredDim === dim.key ? null : dim.key)}
      aria-label={`${dim.name}: ${v.label}. ${sourceName} ${fmtVal(dim, best.src)}, ${winnerName} ${fmtVal(dim, winner.match)}.`}
      className="card flex min-w-0 flex-col p-6 hover:border-(--line-strong) hover:bg-(--card-hover)"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[17px] font-medium">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dim.color }} aria-hidden />
            {dim.name}
          </h3>
          <p className="mt-1 text-[14px] leading-snug text-(--muted)">{dim.hint}</p>
        </div>
        <VerdictBadge score={winner.score} />
      </div>

      <Scale dim={{ ...dim, tol }} src={best.src} match={winner.match} />

      <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-[15px]">
        <dt className="flex min-w-0 items-start gap-2 text-(--muted)">
          <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-(--fg)" aria-hidden />
          <span className="[overflow-wrap:anywhere]">{sourceName}</span>
        </dt>
        <dd className="tnum text-right">{fmtVal(dim, best.src)}</dd>
        <dt className="flex min-w-0 items-start gap-2 text-(--muted)">
          <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: dim.color }} aria-hidden />
          <span className="[overflow-wrap:anywhere]">{winnerName}</span>
        </dt>
        <dd className="tnum text-right">{fmtVal(dim, winner.match)}</dd>
        <dt className="text-(--muted)">Diferencia</dt>
        <dd className="tnum text-right">
          {fmtVal(dim, winner.diff)} <span className="text-(--muted)">de ±{fmtVal(dim, tol)}</span>
        </dd>
      </dl>

      <p className="mt-5 border-t border-(--line) pt-3 text-[14px] leading-snug text-(--muted)">
        {otherBest ? (
          <>
            Mejor solo en {dim.name.toLowerCase()}:{' '}
            <span className="text-(--fg)" title={fmtCoord(best.site.lat, best.site.lon)}>
              {best.site.name}
            </span>{' '}
            <span className="tnum">({fmtVal(dim, best.match)})</span>
          </>
        ) : (
          <>Ningún lugar se acerca más en esta medida.</>
        )}
        {weight !== 1 && <span className="tnum"> · peso ×{weight}</span>}
        <span className="sr-only"> Cercanía {pct(winner.score)}%.</span>
      </p>
    </article>
  )
}
