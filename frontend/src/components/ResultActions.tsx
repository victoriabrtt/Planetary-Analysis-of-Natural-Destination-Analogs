import { useState } from 'react'
import { fmtCoord, pctScore } from '../lib/format'
import { resultDims, useStore } from '../store/useStore'

/** Compartir la consulta (la URL ya la describe) y llevarse el ranking como CSV. */
export default function ResultActions() {
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
      window.prompt('Copiá este enlace:', window.location.href)
    }
  }

  const download = () => {
    const ds = resultDims(dims, result)
    const head = ['puesto', 'lugar', 'lat', 'lon', 'cercania_%', ...ds.flatMap((d) => [`${d.key}_valor`, `${d.key}_dif`])]
    const rows = result.ranking!.map((r, i) => [
      i + 1,
      `"${r.site.name.replace(/"/g, '""')}"`,
      r.site.lat,
      r.site.lon,
      pctScore(r.score),
      ...ds.flatMap((d) => [r.perDim?.[d.key]?.match ?? '', r.perDim?.[d.key]?.diff ?? '']),
    ])
    const src = result.source.name ?? fmtCoord(result.source.lat, result.source.lon)
    const csv = [`# origen: ${src} (${result.source.body}) ${result.source.lat}, ${result.source.lon}`, head.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `analogos-${src.replace(/\W+/g, '-').toLowerCase()}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const btn = 'press h-9 rounded-md border border-(--line) px-3 text-[14px] font-medium transition-colors hover:border-(--line-strong) hover:bg-(--track)'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={copy} className={btn}>
        {copied ? 'Enlace copiado' : 'Copiar enlace'}
      </button>
      <button onClick={download} className={btn}>
        Descargar ranking (CSV)
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Enlace copiado' : ''}
      </span>
    </div>
  )
}
