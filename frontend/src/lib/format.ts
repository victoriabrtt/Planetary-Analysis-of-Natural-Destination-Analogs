import type { Dimension } from '../engine/dimensions'

const nf = (d: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })

export function fmtNum(v: number, decimals = 0): string {
  return nf(decimals).format(v)
}

export function fmtVal(d: Dimension, v: number): string {
  const n = fmtNum(v, d.decimals)
  if (d.unit === 'idx' || !d.unit) return n
  if (d.unit === '°') return `${n}°`
  return `${n} ${d.unit}`
}

export function fmtCoord(lat: number, lon: number): string {
  const la = `${fmtNum(Math.abs(lat), 1)}°${lat >= 0 ? 'N' : 'S'}`
  const lo = `${fmtNum(Math.abs(lon), 1)}°${lon >= 0 ? 'E' : 'O'}`
  return `${la} ${lo}`
}

export const pct = (score: number) => Math.round(score * 100)

/** El backend nombra con coordenadas las celdas sin nombre ("1,3°S 117,7°O"). */
export const isUnnamed = (name: string) => /^\d+,\d°[NS] \d+,\d°[EO]$/.test(name.trim())
/** Título legible para un lugar: las celdas sin nombre no repiten sus coordenadas como título. */
export const placeTitle = (name: string) => (isUnnamed(name) ? 'Zona sin nombre oficial' : name)
