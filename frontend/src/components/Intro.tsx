import { candidates } from '../engine/fingerprint'
import { useT } from '../i18n'
import { fmtNum } from '../lib/format'
import { sourceBodyOf, targetBodyOf, useStore } from '../store/useStore'

/** Una línea: qué hace la herramienta y contra qué compara. */
export default function Intro() {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const dims = useStore((s) => s.dims)
  const bodies = useStore((s) => s.bodies)
  const src = sourceBodyOf(mode, body)
  const tgt = targetBodyOf(mode, body)
  const b = bodies?.[tgt]
  const fact = b
    ? t('intro.factReal', { n: dims.length, cells: fmtNum(b.cells), km: fmtNum(b.cell_km) })
    : t('intro.factMock', { n: dims.length, cells: fmtNum(candidates(tgt).length) })

  return (
    <div className="flex flex-col gap-1 pt-2 lg:flex-row lg:items-baseline lg:justify-between lg:gap-8">
      <h1 className="display text-[28px] [text-wrap:balance] sm:text-[32px]">
        {t('intro.title', { tgt: t(`the.${tgt}`), src: t(`the.${src}`) })}
      </h1>
      <p className="num shrink-0 text-[14px] text-(--muted)">{fact}</p>
    </div>
  )
}
