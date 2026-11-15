import type { Dimension } from '../engine/dimensions'

// Formato según el idioma activo: es-AR (coma decimal, "O" de oeste, "76 %") o en-US
// (punto decimal, "W", "76%"). El store llama a setFormatLang al cambiar de idioma.
let locale: 'es' | 'en' = 'es'
export function setFormatLang(l: 'es' | 'en') {
  locale = l
}

const cache = new Map<string, Intl.NumberFormat>()
const nf = (d: number) => {
  const k = `${locale}:${d}`
  let f = cache.get(k)
  if (!f) {
    f = new Intl.NumberFormat(locale === 'es' ? 'es-AR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
    cache.set(k, f)
  }
  return f
}

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
  const west = locale === 'es' ? 'O' : 'W'
  const la = `${fmtNum(Math.abs(lat), 1)}°${lat >= 0 ? 'N' : 'S'}`
  const lo = `${fmtNum(Math.abs(lon), 1)}°${lon >= 0 ? 'E' : west}`
  return `${la} ${lo}`
}

/** Porcentaje en el formato del idioma: "76 %" (es) o "76%" (en). */
export function fmtPct(p: number, decimals = 0): string {
  return locale === 'es' ? `${fmtNum(p, decimals)} %` : `${fmtNum(p, decimals)}%`
}

export const pct = (score: number) => Math.round(score * 100)
/** Proporción como porcentaje legible: 0,18 %, 23 %, «< 0,01 %». */
export function fmtShare(share: number): string {
  const p = share * 100
  if (p > 0 && p < 0.01) return `< ${fmtPct(0.01, 2)}`
  return fmtPct(p, p < 1 ? 2 : p < 10 ? 1 : 0)
}
/** Cercanía global para mostrar: nunca "100 %", porque dos terrenos distintos no son idénticos. */
export const pctScore = (score: number) => Math.min(99, pct(score))

/** El backend nombra con coordenadas las celdas sin nombre ("1,3°S 117,7°O" o "1.3°S 117.7°W"). */
export const isUnnamed = (name: string) => /^\d+[.,]\d°[NS] \d+[.,]\d°[EOW]$/.test(name.trim())

/** Distancia de gran círculo en km entre dos puntos de un cuerpo de radio R (km). */
export function distKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }, R = 6371): number {
  const r = Math.PI / 180
  const s =
    Math.sin(a.lat * r) * Math.sin(b.lat * r) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((a.lon - b.lon) * r)
  return Math.acos(Math.min(1, Math.max(-1, s))) * R
}
