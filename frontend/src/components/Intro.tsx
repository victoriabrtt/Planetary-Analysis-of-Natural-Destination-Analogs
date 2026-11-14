import { BODY_THE } from '../engine/data'
import { candidates } from '../engine/fingerprint'
import { fmtNum } from '../lib/format'
import { sourceBodyOf, targetBodyOf, useStore } from '../store/useStore'

/** Una línea: qué hace la herramienta y contra qué compara. */
export default function Intro() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const dims = useStore((s) => s.dims)
  const bodies = useStore((s) => s.bodies)
  const src = sourceBodyOf(mode, body)
  const tgt = targetBodyOf(mode, body)
  const t = bodies?.[tgt]
  const fact = t
    ? `${dims.length} medidas del terreno contra ${fmtNum(t.cells)} celdas de ${fmtNum(t.cell_km)} km`
    : `${dims.length} medidas del terreno contra ${fmtNum(candidates(tgt).length)} sitios (motor de demostración)`

  return (
    <div className="flex flex-col gap-1 pt-2 lg:flex-row lg:items-baseline lg:justify-between lg:gap-8">
      <h1 className="display text-[28px] [text-wrap:balance] sm:text-[32px]">
        El terreno de {BODY_THE[tgt]} más parecido a un punto de {BODY_THE[src]}
      </h1>
      <p className="tnum shrink-0 text-[14px] text-(--muted)">{fact}</p>
    </div>
  )
}
