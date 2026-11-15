import { useState } from 'react'
import { fmtCoord, pctScore } from '../lib/format'
import { resultDims, useStore } from '../store/useStore'
import { useT } from '../i18n'

/** Compartir la consulta (la URL ya la describe) y llevarse el ranking como CSV. */
export default function ResultActions() {
  const t = useT()
  const result = useStore((s) => s.result)
  const dims = useStore((s) => s.dims)
  const [copied, setCopied] = useState(false)
  if (!result?.ranking?.length) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt(t('actions.copyPrompt'), window.location.href)
    }
  }

  const download = () => {
    const ds = resultDims(dims, result)
    const src = result.source.name ?? fmtCoord(result.source.lat, result.source.lon)
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`
    const head = ['origen', 'origen_cuerpo', 'origen_lat', 'origen_lon', 'puesto', 'lugar', 'lat', 'lon', 'cercania_pct', ...ds.flatMap((d) => [`${d.key}_valor`, `${d.key}_dif`])]
    const rows = result.ranking!.map((r, i) => [
      q(src),
      result.source.body,
      result.source.lat,
      result.source.lon,
      i + 1,
      `"${r.site.name.replace(/"/g, '""')}"`,
      r.site.lat,
      r.site.lon,
      pctScore(r.score),
      ...ds.flatMap((d) => [r.perDim?.[d.key]?.match ?? '', r.perDim?.[d.key]?.diff ?? '']),
    ])
    const csv = [head.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `analogos-${src.replace(/\W+/g, '-').toLowerCase()}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const btn = 'press h-9 rounded-md border border-(--line) px-3 text-[14px] font-medium transition-colors hover:border-(--line-strong) hover:bg-(--track)'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={copy} className={btn}>
        {copied ? t('actions.copied') : t('actions.copy')}
      </button>
      <button onClick={download} className={btn}>
        {t('actions.csv')}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? t('actions.copied') : ''}
      </span>
    </div>
  )
}
