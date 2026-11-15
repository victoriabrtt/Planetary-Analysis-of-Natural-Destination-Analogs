import { VERDICTS, verdictOf } from '../engine/dimensions'
import { useT } from '../i18n'

/** Veredicto: punto de color + palabra en tinta (nunca solo color, nunca un fondo teñido). */
export default function VerdictBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const t = useT()
  const k = verdictOf(score)
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-(--line) font-medium ${
        size === 'md' ? 'px-2.5 py-1 text-[14px]' : 'px-2 py-0.5 text-[13px]'
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: VERDICTS[k].color }} aria-hidden />
      {t(`verdict.${k}`)}
    </span>
  )
}
