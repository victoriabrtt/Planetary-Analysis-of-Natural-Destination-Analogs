import { useT } from '../i18n'
import { fmtCoord, fmtShare, fmtVal } from '../lib/format'
import { placeTitle } from '../lib/labels'
import { listJoin, qualify } from '../lib/verdict'
import { resultDims, targetBodyOf, useCandidate, useStore } from '../store/useStore'

/** La lectura del resultado en una frase verificable: cuántas medidas reproduce, dónde se rompe y
 *  dónde solo se aleja. Si el terreno es común, lo dice primero y el lugar pasa a ser un ejemplo. */
export default function Reading() {
  const t = useT()
  const result = useStore((s) => s.result)
  const dims = useStore((s) => s.dims)
  const lang = useStore((s) => s.lang)
  const tgt = useStore((s) => targetBodyOf(s.mode, s.body))
  const cand = useCandidate()
  if (!result || !cand) return null

  const raw = result.source.name ? placeTitle(result.source.name, t) : fmtCoord(result.source.lat, result.source.lon)
  // A mitad de frase, "Zona a 962 km de Tycho" va en minúscula ("las 4 medidas de zona a 962 km…").
  const src = /^(Zona|Area) /.test(raw) ? raw[0].toLowerCase() + raw.slice(1) : raw
  const ds = resultDims(dims, result)
  const q = qualify(cand.score, cand.perDim, ds)
  const names = (xs: typeof ds) => listJoin(xs.map((d) => d.name.toLowerCase()), lang)
  const qual = result.overall.qualifying
  const common = cand.rank === 1 && !!qual && qual.share >= 0.05
  const place = placeTitle(cand.site.name, t)
  const measures = q.ok === q.n ? t('reading.all', { n: q.n, src }) : t('reading.some', { ok: q.ok, n: q.n, src })

  // Si el lugar elegido se rompe en una medida pero otro lugar se acerca bastante más en ella, se explica
  // el intercambio (el promedio priorizó las demás) y se nombra lo más cercano en esa medida.
  const tradeoffs = q.broken
    .map((d) => ({ d, best: result.perDim[d.key], w: cand.perDim[d.key] }))
    .filter(({ best, w }) => best && w && best.score - w.score >= 0.15 && best.site.name !== cand.site.name)
  const tail = (
    <>
      {' '}
      <span className="text-(--muted)">{t('reading.withinTol')}</span>
      {q.broken.length > 0 && (
        <>
          <span className="text-(--muted)">{t('reading.breaksIn')}</span> {names(q.broken)}
        </>
      )}
      {q.drifting.length > 0 && (
        <>
          <span className="text-(--muted)">{t('reading.awayIn')}</span> {names(q.drifting)}
        </>
      )}
      <span className="text-(--muted)">.</span>
    </>
  )

  return (
    <p className="max-w-[44rem] text-[20px] leading-snug [text-wrap:pretty] sm:text-[22px]" aria-live="polite">
      {common ? (
        <>
          <span className="text-(--muted)">{t('reading.commonLead', { share: fmtShare(qual!.share), body: t(`the.${tgt}`) })}</span> {measures}
          {tail} <span className="text-(--muted)">{t('reading.forExample')}</span> {place}
          <span className="text-(--muted)">.</span>
        </>
      ) : (
        <>
          {place} <span className="text-(--muted)">{t('reading.reproduces')}</span> {measures}
          {tail}
        </>
      )}
      {tradeoffs.map(({ d, best }) => (
        <span key={d.key} className="mt-2 block text-[16px] text-(--muted) sm:text-[17px]">
          {t('reading.tradeoff', {
            dim: d.name.toLowerCase(),
            src,
            place: placeTitle(best.site.name, t),
            value: fmtVal(d, best.match),
          })}
        </span>
      ))}
    </p>
  )
}
