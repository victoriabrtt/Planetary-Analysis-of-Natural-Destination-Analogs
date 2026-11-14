import { VERDICTS, verdictOf } from '../engine/dimensions'

/** Veredicto con palabra + color (nunca solo color). */
export default function VerdictBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const v = VERDICTS[verdictOf(score)]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-[-0.005em] ${
        size === 'md' ? 'px-3 py-1 text-[13px]' : 'px-2.5 py-0.5 text-xs'
      }`}
      style={{ borderColor: `${v.color}66`, background: `${v.color}1f`, color: 'var(--fg)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.color, boxShadow: `0 0 8px ${v.color}` }} aria-hidden />
      {v.label}
    </span>
  )
}
