// Huella determinista para cualquier punto clickeado (mismo punto → misma huella).
// Usa campos suaves sobre la esfera (sin costura en ±180°), así puntos cercanos
// tienen huellas parecidas. Si el clic cae cerca de un sitio conocido, se usa ese sitio.
import { EARTH, FAMOUS, type Body, type Site, type Vals } from './data'
import { fmtCoord } from '../lib/format'

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const RAD = Math.PI / 180

function unit(lat: number, lon: number): [number, number, number] {
  const c = Math.cos(lat * RAD)
  return [c * Math.cos(lon * RAD), c * Math.sin(lon * RAD), Math.sin(lat * RAD)]
}

type Wave = { dir: [number, number, number]; k: number; phase: number; amp: number }
const waveCache = new Map<string, Wave[]>()

function waves(body: Body, dim: number): Wave[] {
  const key = `${body}:${dim}`
  let w = waveCache.get(key)
  if (!w) {
    const rnd = mulberry32(hashStr(key))
    w = Array.from({ length: 4 }, (_, i) => {
      const z = rnd() * 2 - 1
      const t = rnd() * Math.PI * 2
      const r = Math.sqrt(1 - z * z)
      return {
        dir: [r * Math.cos(t), r * Math.sin(t), z] as [number, number, number],
        k: 1.5 + rnd() * 2.5 * (i + 1),
        phase: rnd() * Math.PI * 2,
        amp: 1 / (i + 1),
      }
    })
    waveCache.set(key, w)
  }
  return w
}

/** Campo suave 0..1 sobre la esfera. */
function field(body: Body, dim: number, lat: number, lon: number): number {
  const p = unit(lat, lon)
  let v = 0
  let total = 0
  for (const w of waves(body, dim)) {
    const d = p[0] * w.dir[0] + p[1] * w.dir[1] + p[2] * w.dir[2]
    v += w.amp * Math.sin(w.k * d * Math.PI + w.phase)
    total += w.amp
  }
  // Leve estiramiento de contraste para no quedarse siempre en el medio.
  const x = Math.max(-1, Math.min(1, (v / total) * 1.6))
  return 0.5 + 0.5 * x
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d

/** Distancia angular de gran círculo en grados. */
export function angularDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = unit(lat1, lon1)
  const b = unit(lat2, lon2)
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)
  return Math.acos(dot) / RAD
}

export function knownSites(body: Body): Site[] {
  return body === 'earth' ? EARTH : FAMOUS[body]
}

const SNAP_DEG = 2.5

export function generatedVals(body: Body, lat: number, lon: number): Vals {
  const f = (i: number) => field(body, i, lat, lon)
  const polar = Math.abs(lat) / 90
  const noise = (f(4) - 0.5) * 12
  switch (body) {
    case 'moon':
      return [
        round(2 + 26 * f(0) ** 1.2),
        round(40 + 500 * f(1)),
        round(5 + 12 * f(2), 1),
        round(10 + 140 * f(3)),
        round(clamp(lerp(15, 88, polar ** 1.5) + noise, 5, 88)),
        round(0.02 + 0.6 * f(5) ** 3, 2),
      ]
    case 'mars':
      return [
        round(2 + 24 * f(0) ** 1.2),
        round(60 + 460 * f(1)),
        round(11 + 6 * f(2), 1),
        round(5 + 60 * f(3)),
        round(clamp(lerp(8, 82, polar ** 1.4) + noise, 5, 88)),
        round(0.03 + 0.5 * f(5) ** 3, 2),
      ]
    case 'earth':
      return [
        round(1 + 22 * f(0) ** 1.2),
        round(30 + 400 * f(1)),
        round(4 + 9 * f(2), 1),
        round(2 + 15 * f(3) ** 3),
        round(clamp(lerp(12, 82, polar ** 1.3) + noise, 5, 88)),
        round(0.02 + 0.5 * f(5) ** 3, 2),
      ]
  }
}

export interface Fingerprint extends Site {
  /** true si el punto coincide con un sitio conocido (curado), false si es generado. */
  known: boolean
}

export function fingerprint(body: Body, lat: number, lon: number): Fingerprint {
  let best: Site | null = null
  let bestD = Infinity
  for (const s of knownSites(body)) {
    const d = angularDist(lat, lon, s.lat, s.lon)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  if (best && bestD <= SNAP_DEG) return { ...best, known: true }
  return { name: fmtCoord(lat, lon), lat, lon, vals: generatedVals(body, lat, lon), known: false }
}

/** Candidatos en el cuerpo destino: sitios curados (+ una grilla generada si no es la Tierra). */
const candCache = new Map<Body, Site[]>()
export function candidates(body: Body): Site[] {
  const cached = candCache.get(body)
  if (cached) return cached
  const out: Site[] = [...knownSites(body)]
  if (body !== 'earth') {
    for (let lat = -82.5; lat <= 82.5; lat += 15) {
      for (let lon = -170; lon < 180; lon += 20) {
        if (out.some((s) => angularDist(s.lat, s.lon, lat, lon) < 6)) continue
        out.push({ name: `Región ${fmtCoord(lat, lon)}`, lat, lon, vals: generatedVals(body, lat, lon) })
      }
    }
  }
  candCache.set(body, out)
  return out
}
