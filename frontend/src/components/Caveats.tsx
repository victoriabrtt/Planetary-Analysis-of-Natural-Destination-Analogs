import { verdictOf } from '../engine/dimensions'
import { useT } from '../i18n'
import { fmtCoord } from '../lib/format'
import { placeTitle } from '../lib/labels'
import { resultDims, targetBodyOf, useCandidate, useStore } from '../store/useStore'

/** Dónde se rompe la analogía: primero las medidas en las que el lugar que se mira NO alcanza
 *  "Fuerte" (con sus valores reales), después lo que ningún lugar puede reproducir. */
export default function Caveats({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const result = useStore((s) => s.result)
  const tgt = useStore((s) => targetBodyOf(s.mode, s.body))
  const dims = useStore((s) => s.dims)
  const cand = useCandidate()
  if (!result || !cand) return null

  const place = placeTitle(cand.site.name, t)
  const src = result.source.name ? placeTitle(result.source.name, t) : fmtCoord(result.source.lat, result.source.lon)
  const bodyThe = t(`the.${tgt}`)
  const rows = resultDims(dims, result).map((d) => {
    const best = result.perDim[d.key]
    const w = cand.perDim[d.key] ?? { match: best.match, diff: best.diff, score: best.score }
    return { d, best, w, k: verdictOf(w.score) }
  })
  const weak = rows.filter((r) => r.k !== 'strong').sort((a, b) => a.w.score - b.w.score)

  return (
    <section className={compact ? '' : 'card p-7 sm:p-8'} aria-labelledby="caveats-title">
      <h2 id="caveats-title" className="display text-[24px]">
        {t('caveats.title')}
      </h2>
      <p className="mt-2 max-w-[44rem] text-[16px] leading-relaxed text-(--muted)">
        {weak.length === 0
          ? t('caveats.allOk', { place, n: rows.length, src, body: bodyThe })
          : t('caveats.some', {
              place,
              src,
              count: weak.length === 1 ? t('caveats.one') : t('caveats.many', { n: weak.length }),
              body: bodyThe,
            })}
      </p>

      <ul className={`mt-5 grid gap-x-10 border-t border-(--line) ${compact ? '' : 'md:grid-cols-2'}`}>
        {result.caveats.map((c) => (
          <li key={c} className="flex gap-3 border-b border-(--line) py-4 text-[16px] leading-relaxed text-(--muted)">
            <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-(--line-strong)" aria-hidden />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
