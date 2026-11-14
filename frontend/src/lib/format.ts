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
