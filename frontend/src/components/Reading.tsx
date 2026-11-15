import { verdictOf } from '../engine/dimensions'
import { useT } from '../i18n'
import { fmtCoord } from '../lib/format'
import { placeTitle } from '../lib/labels'
import { resultDims, useCandidate, useStore } from '../store/useStore'

/** La lectura del resultado en una frase verificable: cuántas medidas reproduce y dónde se aleja.
 *  (La rareza va junto al % en el panel.) */
export default function Reading() {
  const t = useT()
  const result = useStore((s) => s.result)
  const dims = useStore((s) => s.dims)
  const lang = useStore((s) => s.lang)
  const cand = useCandidate()
  if (!result || !cand) return null

  const src = result.source.name ? placeTitle(result.source.name, t) : fmtCoord(result.source.lat, result.source.lon)
  const ds = resultDims(dims, result)
  const ok = ds.filter((d) => verdictOf((cand.perDim[d.key] ?? result.perDim[d.key]).score) === 'strong')
  const away = ds.filter((d) => !ok.includes(d)).map((d) => d.name.toLowerCase())
  const and = lang === 'es' ? 'y' : 'and'
  const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs.at(-1)}`)

  return (
    <p className="max-w-[44rem] text-[20px] leading-snug [text-wrap:pretty] sm:text-[22px]" aria-live="polite">
      {placeTitle(cand.site.name, t)} <span className="text-(--muted)">{t('reading.reproduces')}</span>{' '}
      {ok.length === ds.length ? t('reading.all', { n: ds.length, src }) : t('reading.some', { ok: ok.length, n: ds.length, src })}{' '}
      <span className="text-(--muted)">{t('reading.withinTol')}</span>
      {away.length > 0 && (
        <>
          <span className="text-(--muted)">{t('reading.awayIn')}</span> {list(away)}
        </>
      )}
      <span className="text-(--muted)">.</span>
    </p>
  )
}
