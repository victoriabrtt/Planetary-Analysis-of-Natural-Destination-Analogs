import { useT } from '../i18n'
import { fmtVal } from '../lib/format'
import { useStore } from '../store/useStore'

/** "Cómo se calcula": la explicación al alcance, sin ocupar lugar hasta que se pide. */
export default function Method() {
  const t = useT()
  const dims = useStore((s) => s.dims)
  return (
    <details id="metodo" className="group rounded-[14px] border border-(--line) px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="press flex cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-medium">
        {t('method.title')}
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className="text-(--muted) transition-transform group-open:rotate-180">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-3 flex max-w-[36rem] flex-col gap-3 text-[15px] leading-relaxed text-(--muted)">
        <p>{t('method.p1')}</p>
        <p>
          {t('method.p2')}{' '}
          {dims.map((d, i) => (
            <span key={d.key} className="text-(--fg)">
              {d.name.toLowerCase()} <span className="num">±{fmtVal(d, d.tol)}</span>
              {i < dims.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </p>
        <p>{t('method.p3')}</p>
        <p>{t('method.p4')}</p>
        <p>{t('method.illum')}</p>
        <p>{t('method.scale')}</p>
        <p className="tnum text-[13px]">{t('method.formula')}</p>
      </div>
    </details>
  )
}
