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
  if (!result) return <div className="glass h-full min-h-[260px] motion-safe:animate-pulse" />

  const score = result.overall.score
  const v = VERDICTS[verdictOf(score)]
  const site = result.overall.site
  const src = result.source

  return (
    <motion.section layout transition={spring} className="glass relative flex h-full flex-col overflow-hidden p-6 sm:p-7" aria-live="polite">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${v.color}40, transparent 70%)` }}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="kicker">Cercanía global</div>
        <span className="rounded-full border border-(--line-strong) px-2.5 py-0.5 text-xs font-medium text-(--muted)">
          Perfil · <span className="text-(--fg)">{profile.name}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
        <div className="tnum flex items-start font-semibold leading-none tracking-[-0.06em]">
          <AnimatedNumber value={pct(score)} className="text-[88px] sm:text-[104px]" />
          <span className="mt-3 text-4xl tracking-[-0.03em] text-(--muted)">%</span>
        </div>
        <div className="mb-3">
          <VerdictBadge score={score} size="md" />
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-(--track)">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${v.color}aa, ${v.color})` }}
          initial={false}
          animate={{ width: `${Math.max(2, pct(score))}%` }}
          transition={valueSpring}
        />
      </div>

      <div className="mt-6">
        <div className="text-xs text-(--faint)">Lugar de {BODY_THE[targetBodyOf(mode, body)]} más parecido</div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={site.name}
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={spring}
          >
            <h3 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-[32px]">{site.name}</h3>
            <div className="tnum mt-1 text-sm text-(--faint)">{fmtCoord(site.lat, site.lon)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-auto pt-6 text-sm leading-relaxed text-(--muted)">
        ¿Es <span className="text-(--fg)">{site.name}</span> tan extremo para {BODY_THE[targetBodyOf(mode, body)]} como{' '}
        <span className="text-(--fg)">{src.name ?? fmtCoord(src.lat, src.lon)}</span> lo es para {BODY_THE[src.body]}? Con
        el perfil {profile.name.toLowerCase()}, comparten un <span className="tnum text-(--fg)">{pct(score)}%</span> de su huella.
      </p>
    </motion.section>
  )
}
