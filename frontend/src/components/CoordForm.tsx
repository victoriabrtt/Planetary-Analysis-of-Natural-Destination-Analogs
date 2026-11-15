import { useState, type FormEvent } from 'react'
import { useStore } from '../store/useStore'

const parse = (v: string) => {
  const n = Number(v.trim().replace(',', '.'))
  return v.trim() === '' || !Number.isFinite(n) ? null : n
}

/** Elegir un punto por coordenadas: la alternativa al clic en el globo (teclado, lector de pantalla,
 *  o simplemente saber dónde se quiere ir). Acepta coma o punto decimal. */
export default function CoordForm() {
  const point = useStore((s) => s.point)
  const selectPoint = useStore((s) => s.selectPoint)
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [errors, setErrors] = useState<{ lat?: string; lon?: string }>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const la = parse(lat)
    const lo = parse(lon)
    const next: typeof errors = {}
    if (la == null || la < -90 || la > 90) next.lat = 'Escribí una latitud entre −90 y 90.'
    if (lo == null || lo < -180 || lo > 180) next.lon = 'Escribí una longitud entre −180 y 180.'
    setErrors(next)
    if (!next.lat && !next.lon) selectPoint(la!, lo!)
  }

  const field = (id: 'lat' | 'lon', label: string, value: string, set: (v: string) => void, ph: string) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={`coord-${id}`} className="text-[13px] text-(--muted)">
        {label}
      </label>
      <input
        id={`coord-${id}`}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={ph}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `coord-${id}-err` : undefined}
        className={`tnum h-10 w-full rounded-md border bg-(--bg) px-3 text-[15px] outline-none transition-colors placeholder:text-(--muted)/60 focus-visible:border-accent ${
          errors[id] ? 'border-broken' : 'border-(--line) hover:border-(--line-strong)'
        }`}
      />
      {errors[id] && (
        <span id={`coord-${id}-err`} className="text-[13px] text-(--fg)">
          {errors[id]}
        </span>
      )}
    </div>
  )

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-2" aria-label="Ir a coordenadas">
      {field('lat', 'Latitud', lat, setLat, point.lat.toFixed(1).replace('.', ','))}
      {field('lon', 'Longitud', lon, setLon, point.lon.toFixed(1).replace('.', ','))}
      <button
        type="submit"
        className="press mt-[22px] h-10 rounded-md border border-(--line-strong) px-4 text-[14px] font-medium transition-colors hover:bg-(--track)"
      >
        Ir al punto
      </button>
    </form>
  )
}
