import { BODY_THE } from '../engine/data'
import { verdictOf } from '../engine/dimensions'
import { fmtVal } from '../lib/format'
import { resultDims, targetBodyOf, useStore } from '../store/useStore'

export default function Caveats() {
  const result = useStore((s) => s.result)
  const tgt = useStore((s) => targetBodyOf(s.mode, s.body))
  const dims = useStore((s) => s.dims)
  const caveats = result?.caveats ?? []
  const broken = result ? resultDims(dims, result).filter((d) => verdictOf(result.perDim[d.key].score) === 'broken') : []

  return (
    <section className="card p-7 sm:p-8" aria-labelledby="caveats-title">
      <h2 id="caveats-title" className="display text-[24px]">
        Dónde se rompe la analogía
      </h2>
      <ul className="mt-5 grid gap-x-10 border-t border-(--line) md:grid-cols-2">
        {broken.map((d) => {
          const m = result!.perDim[d.key]
          return (
            <li key={d.key} className="flex gap-3 border-b border-(--line) py-4 text-[16px] leading-relaxed">
              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-broken" aria-hidden />
              <span>
                <span className="font-medium">{d.name}.</span>{' '}
                <span className="text-(--muted)">
                  Ningún lugar de {BODY_THE[tgt]} en el dataset reproduce este valor: el más cercano queda a{' '}
                  <span className="tnum text-(--fg)">{fmtVal(d, m.diff)}</span> (tolerancia ±{fmtVal(d, m.tol ?? d.tol)}).
                </span>
              </span>
            </li>
          )
        })}
        {caveats.map((c) => (
          <li key={c} className="flex gap-3 border-b border-(--line) py-4 text-[16px] leading-relaxed text-(--muted)">
            <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-(--line-strong)" aria-hidden />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
