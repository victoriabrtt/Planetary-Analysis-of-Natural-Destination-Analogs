import { verdictOf } from '../engine/dimensions'
import { fmtVal } from '../lib/format'
import { resultDims, targetBodyOf, useStore } from '../store/useStore'
import { AlertIcon } from './Icons'
import { BODY_THE } from '../engine/data'

export default function Caveats() {
  const result = useStore((s) => s.result)
  const tgt = useStore((s) => targetBodyOf(s.mode, s.body))
  const where = BODY_THE[tgt]
  const caveats = result?.caveats ?? []
  const dims = useStore((s) => s.dims)
  const broken = result ? resultDims(dims, result).filter((d) => verdictOf(result.perDim[d.key].score) === 'broken') : []

  return (
    <section className="glass p-6" aria-labelledby="caveats-title">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-broken/15 text-broken">
          <AlertIcon />
        </span>
        <h3 id="caveats-title" className="text-[15px] font-semibold tracking-[-0.015em]">
          Dónde se rompe la analogía
        </h3>
      </div>
      <ul className={`mt-4 grid gap-2.5 md:grid-cols-2 ${caveats.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
        {caveats.map((c) => (
          <li key={c} className="rounded-2xl border border-(--line) bg-(--track) px-4 py-3 text-sm leading-relaxed text-(--muted)">
            {c}
          </li>
        ))}
      </ul>
      {result && broken.length > 0 && (
        <ul className="mt-2.5 grid gap-2.5 md:grid-cols-2">
          {broken.map((d) => {
            const m = result.perDim[d.key]
            return (
              <li key={d.key} className="rounded-2xl border border-broken/35 bg-broken/8 px-4 py-3 text-sm leading-relaxed text-(--muted)">
                <span className="font-semibold text-(--fg)">{d.name} · Se rompe.</span> Ningún lugar de {where} en el dataset reproduce este
                valor: el más cercano queda a{' '}
                <span className="tnum font-semibold text-(--fg)">{fmtVal(d, m.diff)}</span> (tolerancia ±{fmtVal(d, m.tol ?? d.tol)}).
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
