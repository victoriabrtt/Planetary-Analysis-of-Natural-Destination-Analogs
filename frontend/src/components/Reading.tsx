import { BODY_THE } from '../engine/data'
import { fmtCoord, pct } from '../lib/format'
import { targetBodyOf, useStore } from '../store/useStore'

/** La lectura del resultado, en la voz del producto. Va pegada a los globos, no a un scroll de distancia. */
export default function Reading() {
  const result = useStore((s) => s.result)
  const tgt = useStore((s) => targetBodyOf(s.mode, s.body))
  if (!result) return null
  const src = result.source.name ?? fmtCoord(result.source.lat, result.source.lon)
  return (
    <p className="max-w-[60rem] text-[20px] leading-snug [text-wrap:pretty] sm:text-[22px]" aria-live="polite">
      <span className="text-(--muted)">¿Es</span> {result.overall.site.name}{' '}
      <span className="text-(--muted)">tan extremo para {BODY_THE[tgt]} como</span> {src}{' '}
      <span className="text-(--muted)">lo es para {BODY_THE[result.source.body]}? Comparten el</span>{' '}
      <span className="tnum">{pct(result.overall.score)}%</span> <span className="text-(--muted)">de su forma de terreno.</span>
    </p>
  )
}
