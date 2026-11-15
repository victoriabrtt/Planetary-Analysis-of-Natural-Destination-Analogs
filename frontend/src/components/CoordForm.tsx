import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '../i18n'
import { fmtNum } from '../lib/format'
import { useStore } from '../store/useStore'
import { revealAnswer } from '../lib/reveal'

const parse = (v: string) => {
  const n = Number(v.trim().replace(',', '.'))
  return v.trim() === '' || !Number.isFinite(n) ? null : n
}

/** Elegir un punto por coordenadas: la alternativa al clic en el globo (teclado, lector de pantalla,
 *  o simplemente saber dónde se quiere ir). Acepta coma o punto decimal. */
export default function CoordForm() {
  const t = useT()
  const point = useStore((s) => s.point)
  const selectPoint = useStore((s) => s.selectPoint)
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [errors, setErrors] = useState<{ lat?: string; lon?: string }>({})
  const latRef = useRef<HTMLInputElement>(null)
  const lonRef = useRef<HTMLInputElement>(null)
  const submitted = useRef<{ lat: number; lon: number } | null>(null)

  // Si el punto cambia desde otro lado (globo, sitio, atrás), los campos se vacían: nada viejo queda escrito.
  useEffect(() => {
    const s = submitted.current
    if (s && s.lat === point.lat && s.lon === point.lon) return
    setLat('')
    setLon('')
    setErrors({})
  }, [point])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const la = parse(lat)
    const lo = parse(lon)
    const next: typeof errors = {}
    if (la == null || la < -90 || la > 90) next.lat = t('coord.latErr')
    if (lo == null || lo < -180 || lo > 180) next.lon = t('coord.lonErr')
    setErrors(next)
    if (next.lat) return latRef.current?.focus()
    if (next.lon) return lonRef.current?.focus()
    submitted.current = { lat: la!, lon: lo! }
    selectPoint(la!, lo!)
    setTimeout(() => revealAnswer(true), 350)
  }

  const field = (id: 'lat' | 'lon', label: string, value: string, set: (v: string) => void, ph: string) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={`coord-${id}`} className="text-[13px] text-(--muted)">
        {label}
      </label>
      <input
        ref={id === 'lat' ? latRef : lonRef}
        id={`coord-${id}`}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={ph}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `coord-${id}-err` : undefined}
        className={`tnum h-10 w-full rounded-md border bg-(--bg) px-3 text-[15px] outline-none transition-colors placeholder:text-(--muted) focus-visible:border-accent ${
          errors[id] ? 'border-broken' : 'border-(--line) hover:border-(--line-strong)'
        }`}
      />
      {errors[id] && (
        <span id={`coord-${id}-err`} className="flex items-start gap-1.5 text-[13px]">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-broken" aria-hidden />
          {errors[id]}
        </span>
      )}
    </div>
  )

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-2" aria-label={t('coord.form')}>
      {field('lat', t('coord.lat'), lat, setLat, fmtNum(point.lat, 1))}
      {field('lon', t('coord.lon'), lon, setLon, fmtNum(point.lon, 1))}
      <button
        type="submit"
        className="press mt-[22px] h-10 rounded-md border border-(--line-strong) px-4 text-[14px] font-medium transition-colors hover:bg-(--track)"
      >
        {t('coord.go')}
      </button>
    </form>
  )
}
