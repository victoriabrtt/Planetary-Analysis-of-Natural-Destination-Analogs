import { motion } from 'framer-motion'
import { VERDICTS, verdictOf } from '../engine/dimensions'
import { fmtCoord, pct } from '../lib/format'
import { spring } from '../lib/motion'
import { useStore } from '../store/useStore'

/** Los lugares más parecidos. Cada fila lleva el globo destino hasta ese lugar. */
export default function Ranking() {
  const ranking = useStore((s) => s.result?.ranking)
  const inspect = useStore((s) => s.inspect)
  const setInspect = useStore((s) => s.setInspect)
  if (!ranking?.length) return null
  // Por nombre y coordenadas: el mismo nombre de región puede aparecer en dos puestos.
  const keyOf = (s: { name: string; lat: number; lon: number }) => `${s.name}|${s.lat}|${s.lon}`
  const current = keyOf(inspect ?? ranking[0].site)

  return (
    <section aria-labelledby="ranking-title">
      <h2 id="ranking-title" className="display text-[24px]">
        Otros lugares parecidos
      </h2>
      <p className="mt-1 text-[16px] text-(--muted)">Tocá uno para verlo en el globo.</p>
      <ol className="mt-4 border-t border-(--line)">
        {ranking.map((r, i) => {
          const v = VERDICTS[verdictOf(r.score)]
          const active = keyOf(r.site) === current
          return (
            <motion.li key={`${r.site.name}-${r.site.lat}-${r.site.lon}`} layout transition={spring} className="border-b border-(--line)">
              <button
                onClick={() => setInspect(i === 0 ? null : r.site)}
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
                  <span className="tnum block text-[15px]">{pct(r.score)}%</span>
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
