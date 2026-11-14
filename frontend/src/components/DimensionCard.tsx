import { AnimatePresence, motion } from 'framer-motion'
import type { DimMatch } from '../api/types'
import { BODY_LABEL, type Body } from '../engine/data'
import { VERDICTS, verdictOf, type Dimension } from '../engine/dimensions'
import { fmtCoord, fmtVal, pct } from '../lib/format'
import { spring, valueSpring } from '../lib/motion'
import { useStore } from '../store/useStore'
import AnimatedNumber from './AnimatedNumber'
import VerdictBadge from './VerdictBadge'

interface Props {
  dim: Dimension
  m: DimMatch
  weight: number
  sourceBody: Body
  targetBody: Body
}

/** Una card por dimensión. No es un link, así que no se levanta: al pasar el mouse resalta su
 *  marcador en el globo y la card cambia de fondo y borde. */
export default function DimensionCard({ dim, m, weight, sourceBody, targetBody }: Props) {
  const setHoveredDim = useStore((s) => s.setHoveredDim)
  const v = VERDICTS[verdictOf(m.score)]

  return (
    <article
      onMouseEnter={() => setHoveredDim(dim.key)}
      onMouseLeave={() => setHoveredDim(null)}
      onFocus={() => setHoveredDim(dim.key)}
      onBlur={() => setHoveredDim(null)}
      tabIndex={0}
      aria-label={`${dim.name}: ${pct(m.score)}% de cercanía, ${v.label}. Mejor análogo ${m.site.name}.`}
      className="card flex flex-col p-6 hover:border-(--line-strong) hover:bg-(--card-hover)"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: dim.color }} aria-hidden />
          <h3 className="text-[17px] font-medium tracking-[-0.01em]">{dim.name}</h3>
        </div>
        <VerdictBadge score={m.score} />
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="figure text-[24px] leading-none">
          <AnimatedNumber value={pct(m.score)} />
          <span className="text-(--muted)">%</span>
        </span>
        {weight !== 1 && <span className="tnum text-[13px] text-(--muted)">peso ×{weight}</span>}
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-(--track)" role="presentation">
        <motion.div
          className="h-full rounded-full"
          style={{ background: v.color }}
          initial={false}
          animate={{ width: `${Math.max(2, pct(m.score))}%` }}
          transition={valueSpring}
        />
      </div>

      <div className="mt-5">
        <div className="kicker">Mejor análogo</div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={m.site.name}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={spring}
            className="truncate text-[16px] font-medium"
            title={`${m.site.name} · ${fmtCoord(m.site.lat, m.site.lon)}`}
          >
            {m.site.name}
          </motion.div>
        </AnimatePresence>
      </div>

      <dl className="mt-5 divide-y divide-(--line) border-t border-(--line) text-[15px]">
        <div className="flex items-baseline justify-between py-2.5">
          <dt className="kicker">{BODY_LABEL[sourceBody]}</dt>
          <dd className="tnum">{fmtVal(dim, m.src)}</dd>
        </div>
        <div className="flex items-baseline justify-between py-2.5">
          <dt className="kicker">{BODY_LABEL[targetBody]}</dt>
          <dd className="tnum">{fmtVal(dim, m.match)}</dd>
        </div>
        <div className="flex items-baseline justify-between py-2.5">
          <dt className="kicker">Diferencia real</dt>
          <dd className="tnum">
            {fmtVal(dim, m.diff)} <span className="text-(--muted)">/ ±{fmtVal(dim, m.tol ?? dim.tol)}</span>
          </dd>
        </div>
      </dl>
    </article>
  )
}
