import { BODY_THE } from '../engine/data'
import { candidates } from '../engine/fingerprint'
import { fmtNum } from '../lib/format'
import { sourceBodyOf, targetBodyOf, useStore } from '../store/useStore'

/** El h1 nombra lo que hace la herramienta; la línea de abajo da el dato duro. */
export default function Intro() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const dims = useStore((s) => s.dims)
  const bodies = useStore((s) => s.bodies)
  const src = sourceBodyOf(mode, body)
  const tgt = targetBodyOf(mode, body)
  const t = bodies?.[tgt]

  const fact = t
    ? `Compara ${dims.length} medidas del terreno contra ${fmtNum(t.cells)} celdas de ${fmtNum(t.cell_km)} km de ${BODY_THE[tgt]}, calculadas con modelos de elevación de la NASA y la NOAA.`
    : `Compara ${dims.length} medidas del terreno contra ${fmtNum(candidates(tgt).length)} sitios de ${BODY_THE[tgt]} con el motor local de demostración.`

  return (
    <div className="max-w-[46rem] pt-4">
      <h1 className="display text-[34px] sm:text-[48px]">
        Encontrá el lugar de {BODY_THE[tgt]} con el terreno más parecido a un punto de {BODY_THE[src]}
      </h1>
      <p className="mt-4 max-w-[40rem] text-[17px] leading-relaxed text-(--muted)">{fact}</p>
    </div>
  )
}
