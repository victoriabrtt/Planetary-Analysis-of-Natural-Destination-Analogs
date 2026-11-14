import { AnimatePresence, motion } from 'framer-motion'
import { BODY_THE } from '../engine/data'
import { VERDICTS, verdictOf } from '../engine/dimensions'
import { fmtCoord, pct } from '../lib/format'
import { spring, valueSpring } from '../lib/motion'
import { targetBodyOf, useActiveProfile, useStore } from '../store/useStore'
import AnimatedNumber from './AnimatedNumber'
import VerdictBadge from './VerdictBadge'

export default function ResultHero() {
  const result = useStore((s) => s.result)
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const profile = useActiveProfile()
  if (!result) return <div className="card h-full min-h-[260px] motion-safe:animate-pulse" />

  const score = result.overall.score
  const v = VERDICTS[verdictOf(score)]
  const site = result.overall.site
  const src = result.source
  const tgt = targetBodyOf(mode, body)

  return (
    <section className="card flex h-full flex-col p-7 sm:p-8" aria-live="polite" aria-label="Cercanía global">
      <div className="flex items-center justify-between gap-3">
        <p className="kicker">Cercanía global · perfil {profile.name.toLowerCase()}</p>
        <VerdictBadge score={score} size="md" />
      </div>

      <div className="figure mt-4 flex items-start leading-none">
        <AnimatedNumber value={pct(score)} className="text-[96px] sm:text-[112px]" />
        <span className="mt-3 text-[40px] text-(--muted)">%</span>
      </div>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-(--track)">
        <motion.div
          className="h-full rounded-full"
          style={{ background: v.color }}
          initial={false}
          animate={{ width: `${Math.max(2, pct(score))}%` }}
          transition={valueSpring}
        />
      </div>

      <div className="mt-7">
        <div className="kicker">Lugar de {BODY_THE[tgt]} más parecido</div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={site.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
            <p className="display mt-1 text-[30px] [overflow-wrap:anywhere] sm:text-[36px]">{site.name}</p>
            <div className="tnum mt-1.5 text-[13px] text-(--muted)">{fmtCoord(site.lat, site.lon)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-auto max-w-[36rem] pt-7 text-[16px] leading-relaxed text-(--muted)">
        ¿Es <span className="text-(--fg)">{site.name}</span> tan extremo para {BODY_THE[tgt]} como{' '}
        <span className="text-(--fg)">{src.name ?? fmtCoord(src.lat, src.lon)}</span> lo es para {BODY_THE[src.body]}? Comparten
        el <span className="text-(--fg)">{pct(score)}%</span> de su forma de terreno.
      </p>
    </section>
  )
}
