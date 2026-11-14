import { AnimatePresence, motion } from 'framer-motion'
import type { DimMatch } from '../api/types'
import { BODY_LABEL, type Body } from '../engine/data'
import { VERDICTS, verdictOf, type Dimension } from '../engine/dimensions'
import { fmtCoord, fmtVal, pct } from '../lib/format'
import { spring } from '../lib/motion'
import { useStore } from '../store/useStore'
import AnimatedNumber from './AnimatedNumber'
import VerdictBadge from './VerdictBadge'

interface Props {
  dim: Dimension
  m: DimMatch
  weight: number
  sourceBody: Body
  targetBody: Body
  index: number
}

export default function DimensionCard({ dim, m, weight, sourceBody, targetBody, index }: Props) {
  const setHoveredDim = useStore((s) => s.setHoveredDim)
  const v = VERDICTS[verdictOf(m.score)]

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHoveredDim(dim.key)}
      onHoverEnd={() => setHoveredDim(null)}
      onFocus={() => setHoveredDim(dim.key)}
      onBlur={() => setHoveredDim(null)}
      tabIndex={0}
      aria-label={`${dim.name}: ${pct(m.score)}% de cercanía, ${v.label}. Mejor análogo ${m.site.name}.`}
      className="glass group flex flex-col p-5 transition-[background,border-color] duration-300 hover:border-(--line-strong) hover:bg-(--glass-hover) focus-visible:rounded-[24px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: dim.color, boxShadow: `0 0 10px ${dim.color}` }} aria-hidden />
          <h4 className="text-[15px] font-semibold tracking-[-0.015em]">{dim.name}</h4>
        </div>
        <VerdictBadge score={m.score} />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tnum text-[40px] font-semibold leading-none tracking-[-0.05em]">
          <AnimatedNumber value={pct(m.score)} />
          <span className="text-xl text-(--muted)">%</span>
        </span>
        {weight !== 1 && (
          <span className="tnum rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent">peso ×{weight}</span>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-(--track)" role="presentation">
        <motion.div
          className="h-full rounded-full"
          style={{ background: v.color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, pct(m.score))}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: index * 0.04 }}
        />
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-medium text-(--faint)">Mejor análogo</div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={m.site.name}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={spring}
            className="truncate text-[15px] font-medium tracking-[-0.01em]"
            title={`${m.site.name} · ${fmtCoord(m.site.lat, m.site.lon)}`}
          >
            {m.site.name}
          </motion.div>
        </AnimatePresence>
      </div>

      <dl className="tnum mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2 rounded-2xl border border-(--line) bg-(--track) px-3.5 py-3 text-sm">
        <div>
          <dt className="text-[11px] text-(--faint)">{BODY_LABEL[sourceBody]}</dt>
          <dd className="font-semibold">{fmtVal(dim, m.src)}</dd>
        </div>
        <div className="pb-0.5 text-(--faint)" aria-hidden>
          →
        </div>
        <div className="text-right">
          <dt className="text-[11px] text-(--faint)">{BODY_LABEL[targetBody]}</dt>
          <dd className="font-semibold">{fmtVal(dim, m.match)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-(--muted)">
          Diferencia real <span className="tnum font-semibold text-(--fg)">Δ {fmtVal(dim, m.diff)}</span>
        </span>
        <span className="tnum text-(--faint)" title="Tolerancia física de la dimensión">
          tol. ±{fmtVal(dim, m.tol ?? dim.tol)}
        </span>
      </div>
    </motion.article>
  )
}
