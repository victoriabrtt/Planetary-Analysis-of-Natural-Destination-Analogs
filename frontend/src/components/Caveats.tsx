import { BODY_THE } from '../engine/data'
import { VERDICTS, verdictOf } from '../engine/dimensions'
import { fmtCoord, fmtVal } from '../lib/format'
import { resultDims, targetBodyOf, useCandidate, useStore } from '../store/useStore'

/** Dónde se rompe la analogía: primero las medidas en las que el lugar ganador NO alcanza
 *  "Fuerte" (con sus valores reales), después lo que ningún lugar puede reproducir. */
export default function Caveats({ compact = false }: { compact?: boolean }) {
  const result = useStore((s) => s.result)
  const tgt = useStore((s) => targetBodyOf(s.mode, s.body))
  const dims = useStore((s) => s.dims)
  const cand = useCandidate()
  if (!result || !cand) return null

  const winner = cand.site
  const src = result.source.name ?? fmtCoord(result.source.lat, result.source.lon)
  const rows = resultDims(dims, result).map((d) => {
    const best = result.perDim[d.key]
    const w = cand.perDim[d.key] ?? { match: best.match, diff: best.diff, score: best.score }
    return { d, best, w, verdict: verdictOf(w.score) }
  })
  const weak = rows.filter((r) => r.verdict !== 'strong').sort((a, b) => a.w.score - b.w.score)

  return (
    <section className={compact ? '' : 'card p-7 sm:p-8'} aria-labelledby="caveats-title">
      <h2 id="caveats-title" className="display text-[24px]">
        Dónde se rompe la analogía
      </h2>
      <p className="mt-2 max-w-[44rem] text-[16px] leading-relaxed text-(--muted)">
        {weak.length === 0 ? (
          <>
            En el terreno, <span className="text-(--fg)">{winner.name}</span> reproduce las {rows.length} medidas de {src} dentro de
            su tolerancia. Lo que no puede reproducir ningún lugar de {BODY_THE[tgt]}:
          </>
        ) : (
          <>
            <span className="text-(--fg)">{winner.name}</span> se aleja de {src} en{' '}
            {weak.length === 1 ? 'una medida' : `${weak.length} medidas`} del terreno, y además hay cosas que ningún lugar de{' '}
            {BODY_THE[tgt]} reproduce:
          </>
        )}
      </p>

      <ul className={`mt-5 grid gap-x-10 border-t border-(--line) ${compact ? '' : 'md:grid-cols-2'}`}>
        {weak.map(({ d, best, w, verdict }) => (
          <li key={d.key} className="flex gap-3 border-b border-(--line) py-4 text-[16px] leading-relaxed">
            <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full" style={{ background: VERDICTS[verdict].color }} aria-hidden />
            <span>
              <span className="font-medium">
                {d.name}: {VERDICTS[verdict].label.toLowerCase()}.
              </span>{' '}
              <span className="text-(--muted)">
                <span className="tnum text-(--fg)">{fmtVal(d, best.src)}</span> en {src} contra{' '}
                <span className="tnum text-(--fg)">{fmtVal(d, w.match)}</span> en {winner.name}: una diferencia de{' '}
                <span className="tnum text-(--fg)">{fmtVal(d, w.diff)}</span>, con tolerancia de ±{fmtVal(d, best.tol ?? d.tol)}.
              </span>
            </span>
          </li>
        ))}
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
