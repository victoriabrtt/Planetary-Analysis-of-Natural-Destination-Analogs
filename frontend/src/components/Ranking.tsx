import { motion } from 'framer-motion'
import { VERDICTS, verdictOf } from '../engine/dimensions'
import { fmtCoord, pctScore } from '../lib/format'
import { spring } from '../lib/motion'
import { useStore } from '../store/useStore'

/** Los lugares más parecidos. Tocar uno lo muestra en el panel de la Tierra (lugar, %, medidas y globo). */
export default function Ranking() {
  const ranking = useStore((s) => s.result?.ranking)
  const inspectIdx = useStore((s) => s.inspectIdx)
  const setInspect = useStore((s) => s.setInspect)
  if (!ranking?.length) return null
  const current = inspectIdx ?? 0

  const choose = (i: number) => {
    setInspect(i)
    // En pantallas angostas el globo queda muy arriba: lo traemos a la vista.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById('analogo')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }

  return (
    <section aria-labelledby="ranking-title">
      <h2 id="ranking-title" className="display text-[24px]">
        Otros lugares parecidos
      </h2>
      <p className="mt-1 text-[16px] text-(--muted)">Tocá uno para compararlo en el panel y en el globo.</p>
      <ol className="mt-4 border-t border-(--line)">
        {ranking.map((r, i) => {
          const v = VERDICTS[verdictOf(r.score)]
          const active = i === current
          return (
            <motion.li key={`${r.site.name}-${r.site.lat}-${r.site.lon}`} layout transition={spring} className="border-b border-(--line)">
              <button
                onClick={() => choose(i)}
                aria-pressed={active}
                className={`press grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-md px-2 py-3 text-left transition-colors ${
                  active ? 'bg-(--track)' : 'hover:bg-(--track)'
                }`}
              >
                <span className="tnum text-[13px] text-(--muted)">{i + 1}</span>
                <span className="min-w-0">
                  <span className={`block text-[16px] leading-snug [overflow-wrap:anywhere] ${active ? 'font-medium' : ''}`}>{r.site.name}</span>
                  <span className="tnum block text-[13px] text-(--muted)">{fmtCoord(r.site.lat, r.site.lon)}</span>
                </span>
                <span className="text-right">
                  <span className="tnum block text-[15px]">{pctScore(r.score)}%</span>
                  <span className="flex items-center justify-end gap-1.5 text-[13px] text-(--muted)">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.color }} aria-hidden />
                    {v.label}
                  </span>
                </span>
              </button>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}
