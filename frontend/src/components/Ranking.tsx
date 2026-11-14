import { motion } from 'framer-motion'
import { VERDICTS, verdictOf } from '../engine/dimensions'
import { fmtCoord, pct } from '../lib/format'
import { spring } from '../lib/motion'
import { useStore } from '../store/useStore'

export default function Ranking() {
  const ranking = useStore((s) => s.result?.ranking)
  if (!ranking?.length) return null
  return (
    <section className="glass flex h-full flex-col p-6" aria-label="Ranking de análogos">
      <div className="kicker">Ranking · top {ranking.length}</div>
      <ol className="mt-4 flex flex-1 flex-col justify-between gap-2">
        {ranking.map((r, i) => {
          const v = VERDICTS[verdictOf(r.score)]
          return (
            <motion.li
              key={`${r.site.name}-${r.site.lat}-${r.site.lon}`}
              layout
              transition={spring}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${i === 0 ? 'bg-accent/12 ring-1 ring-accent/40' : ''}`}
            >
              <span className={`tnum w-5 text-sm font-semibold ${i === 0 ? 'text-accent' : 'text-(--faint)'}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium tracking-[-0.01em]">{r.site.name}</span>
                  <span className="tnum shrink-0 text-[11px] text-(--faint)">{fmtCoord(r.site.lat, r.site.lon)}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-(--track)">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: v.color }}
                    initial={false}
                    animate={{ width: `${Math.max(2, pct(r.score))}%` }}
                    transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                  />
                </div>
              </div>
              <div className="w-20 text-right">
                <div className="tnum text-sm font-semibold">{pct(r.score)}%</div>
                <div className="text-[11px] text-(--faint)">{v.label}</div>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}
