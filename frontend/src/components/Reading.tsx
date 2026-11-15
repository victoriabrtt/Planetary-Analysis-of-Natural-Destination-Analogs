import { BODY_THE } from '../engine/data'
import { verdictOf } from '../engine/dimensions'
import { fmtCoord, fmtShare } from '../lib/format'
import { resultDims, targetBodyOf, useCandidate, useStore } from '../store/useStore'

/** La lectura del resultado en una frase verificable: cuántas medidas reproduce, dónde se rompe y si
 *  es un análogo raro o común. Nada de "comparten el 100%". */
export default function Reading() {
  const result = useStore((s) => s.result)
  const dims = useStore((s) => s.dims)
  const tgt = useStore((s) => targetBodyOf(s.mode, s.body))
  const cand = useCandidate()
  if (!result || !cand) return null

  const src = result.source.name ?? fmtCoord(result.source.lat, result.source.lon)
  const ds = resultDims(dims, result)
  const ok = ds.filter((d) => verdictOf((cand.perDim[d.key] ?? result.perDim[d.key]).score) === 'strong')
  const broken = ds.filter((d) => !ok.includes(d))
  const q = result.overall.qualifying
  const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

  return (
    <p className="max-w-[62rem] text-[20px] leading-snug [text-wrap:pretty] sm:text-[22px]" aria-live="polite">
      {cand.site.name} <span className="text-(--muted)">reproduce</span>{' '}
      {ok.length === ds.length ? 'las' : `${ok.length} de las`} {ds.length} medidas de {src}{' '}
      <span className="text-(--muted)">dentro de su tolerancia</span>
      {broken.length > 0 && (
        <>
          <span className="text-(--muted)">; se aleja en</span> {list(broken.map((d) => d.name.toLowerCase()))}
        </>
      )}
      <span className="text-(--muted)">.</span>
      {q && cand.rank === 1 && (
        <span className="text-(--muted)">
          {' '}
          {q.count === 0
            ? `Ningún lugar de ${BODY_THE[tgt]} llega a ser un análogo fuerte: este es el más cercano.`
            : q.share >= 0.05
              ? `Es un terreno común: califica el ${fmtShare(q.share)} de ${BODY_THE[tgt]}.`
              : q.count === 1
                ? `Es un análogo único: es el único lugar de ${BODY_THE[tgt]} que califica.`
                : q.share < 0.0001
                  ? `Es un análogo raro: solo ${q.count} celdas de ${BODY_THE[tgt]} califican.`
                  : `Es un análogo raro: califica solo el ${fmtShare(q.share)} de ${BODY_THE[tgt]}.`}
        </span>
      )}
    </p>
  )
}
