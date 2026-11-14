import { motion } from 'framer-motion'
import { VERDICTS, verdictOf } from '../engine/dimensions'
import { fmtCoord, pct } from '../lib/format'
import { spring, valueSpring } from '../lib/motion'
import { useStore } from '../store/useStore'

export default function Ranking() {
  const ranking = useStore((s) => s.result?.ranking)
  if (!ranking?.length) return null
  return (
    <section className="card flex h-full flex-col p-7 sm:p-8" aria-label={`Los ${ranking.length} lugares más parecidos`}>
      <p className="kicker">Los {ranking.length} lugares más parecidos</p>
      <ol className="mt-4 flex flex-1 flex-col">
        {ranking.map((r, i) => {
          const v = VERDICTS[verdictOf(r.score)]
          return (
            <motion.li
              key={`${r.site.name}-${r.site.lat}-${r.site.lon}`}
              layout
              transition={spring}
              className="grid flex-1 grid-cols-[1.5rem_1fr_auto] items-center gap-3 border-b border-(--line) py-3 last:border-b-0"
            >
              <span className={`tnum text-[13px] ${i === 0 ? 'text-(--fg)' : 'text-(--muted)'}`}>{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className={`min-w-0 text-[16px] leading-snug [overflow-wrap:anywhere] ${i === 0 ? 'font-medium' : ''}`}>{r.site.name}</span>
                  <span className="tnum hidden shrink-0 text-[13px] text-(--muted) sm:inline">{fmtCoord(r.site.lat, r.site.lon)}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-(--track)">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: v.color }}
                    initial={false}
                    animate={{ width: `${Math.max(2, pct(r.score))}%` }}
                    transition={valueSpring}
                  />
                </div>
              </div>
              <div className="w-20 text-right">
                <div className="tnum text-[15px]">{pct(r.score)}%</div>
                <div className="kicker">{v.label}</div>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}
