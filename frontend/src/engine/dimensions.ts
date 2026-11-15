// Las 6 dimensiones de la "huella" de un lugar y los perfiles de misión.

// Claves abiertas: el backend puede sumar dimensiones (fase 2) sin tocar el front.
export type DimKey = string

export interface Dimension {
  key: DimKey
  name: string
  short: string
  unit: string
  /** Tolerancia física: cuánta diferencia absoluta cuenta como "lejos". */
  tol: number
  range: [number, number]
  decimals: number
  /** Color categórico del marcador en el globo (distinto de los colores de veredicto). */
  color: string
  hint: string
}

export const DIMS: Dimension[] = [
  { key: 'terrain', name: 'Pendiente', short: 'Pendiente', unit: '°', tol: 12, range: [0, 35], decimals: 0, color: '#fda4af', hint: 'Inclinación media del terreno' },
  { key: 'roughness', name: 'Rugosidad', short: 'Rugosidad', unit: 'm', tol: 120, range: [20, 600], decimals: 0, color: '#94a3b8', hint: 'Cuánto sube y baja el terreno alrededor de su inclinación' },
  { key: 'composition', name: 'Hierro (FeO)', short: 'Hierro (FeO)', unit: '% FeO', tol: 6, range: [4, 18], decimals: 1, color: '#f472b6', hint: 'Óxido de hierro en superficie' },
  { key: 'craters', name: 'Cráteres', short: 'Cráteres', unit: '/Mkm²', tol: 40, range: [2, 160], decimals: 0, color: '#fde047', hint: 'Cráteres > 1 km por millón de km²' },
  { key: 'illum', name: 'Iluminación', short: 'Iluminación', unit: '°', tol: 18, range: [5, 88], decimals: 0, color: '#fdba74', hint: 'Qué tan rasante pega el sol en el mejor momento del año' },
  { key: 'caves', name: 'Cuevas', short: 'Cuevas', unit: 'idx', tol: 0.3, range: [0, 1], decimals: 2, color: '#2dd4bf', hint: 'Probabilidad de tubos de lava y cavidades (0 a 1)' },
]

export const DIM_BY_KEY: Record<DimKey, Dimension> = Object.fromEntries(DIMS.map((d) => [d.key, d]))

/** Colores categóricos por clave (los marcadores del globo). Claves nuevas toman uno de reserva. */
const DIM_COLORS: Record<string, string> = {
  ...Object.fromEntries(DIMS.map((d) => [d.key, d.color])),
  relief: '#67e8f9',
}
const SPARE_COLORS = ['#93c5fd', '#f9a8d4', '#fcd34d', '#fca5a5', '#99f6e4']

/** Dimensión tal como la describe GET /api/meta. */
export interface DimMeta {
  key: string
  name: string
  short?: string
  unit: string
  tol: number
  decimals?: number
  hint?: string
}

export function dimFromMeta(m: DimMeta, i: number): Dimension {
  const local = DIM_BY_KEY[m.key]
  return {
    key: m.key,
    name: m.name,
    short: m.short ?? local?.short ?? m.name,
    unit: m.unit,
    tol: m.tol,
    range: local?.range ?? [0, m.tol * 4],
    decimals: m.decimals ?? local?.decimals ?? 0,
    color: DIM_COLORS[m.key] ?? SPARE_COLORS[i % SPARE_COLORS.length],
    hint: m.hint ?? local?.hint ?? '',
  }
}

/** Para claves que llegan en perDim pero no están en el catálogo. */
export function fallbackDim(key: string, i: number): Dimension {
  return dimFromMeta({ key, name: key, unit: '', tol: 1 }, i)
}

export type Weights = Record<DimKey, number>

export interface Profile {
  id: string
  name: string
  blurb: string
  weights: Partial<Weights>
}

export const PROFILES: Profile[] = [
  { id: 'balanced', name: 'Balanceado', blurb: 'Todas las medidas pesan igual', weights: {} },
  { id: 'rover', name: 'Rover', blurb: 'Movilidad: pendiente, rugosidad y cráteres', weights: { terrain: 3, roughness: 2.5, craters: 1.5 } },
  { id: 'thermal', name: 'Térmico', blurb: 'Iluminación y composición del suelo', weights: { illum: 3, composition: 1.5 } },
  { id: 'habitat', name: 'Hábitat / cuevas', blurb: 'Refugio natural en tubos de lava', weights: { caves: 3.5, roughness: 1.5 } },
]

export function profileWeights(p: Profile, dims: Dimension[] = DIMS): Weights {
  return Object.fromEntries(dims.map((d) => [d.key, p.weights[d.key] ?? 1]))
}

/** cercanía = exp(-(|a-b|/tol)^2) → 0..1 */
export function closeness(a: number, b: number, tol: number): number {
  const x = Math.abs(a - b) / tol
  return Math.exp(-x * x)
}

export type VerdictKey = 'strong' | 'moderate' | 'weak' | 'broken'

export const VERDICTS: Record<VerdictKey, { label: string; color: string }> = {
  strong: { label: 'Fuerte', color: '#0ca30c' },
  moderate: { label: 'Moderado', color: '#d98a00' },
  weak: { label: 'Débil', color: '#ec835a' },
  broken: { label: 'Se rompe', color: '#d03b3b' },
}

export function verdictOf(score: number): VerdictKey {
  // Sobre el porcentaje que se muestra: si dice 75%, el veredicto es Fuerte (no "Moderado" por 0,7499).
  const p = Math.round(score * 100)
  if (p >= 75) return 'strong'
  if (p >= 50) return 'moderate'
  if (p >= 25) return 'weak'
  return 'broken'
}

/** Catálogo local (modo mock) en el idioma pedido: las mismas dimensiones y perfiles, traducidos. */
const DIMS_EN: Record<string, { name: string; hint: string }> = {
  terrain: { name: 'Slope', hint: 'Average steepness of the terrain' },
  roughness: { name: 'Roughness', hint: 'How much the ground rises and falls around its tilt' },
  composition: { name: 'Iron (FeO)', hint: 'Iron oxide on the surface' },
  craters: { name: 'Craters', hint: 'Craters larger than 1 km per million km²' },
  illum: { name: 'Illumination', hint: 'How low the sun sits at its best time of year' },
  caves: { name: 'Caves', hint: 'Likelihood of lava tubes and cavities (0 to 1)' },
}
const PROFILES_EN: Record<string, { name: string; blurb: string }> = {
  balanced: { name: 'Balanced', blurb: 'Every measure weighs the same' },
  rover: { name: 'Rover', blurb: 'Mobility: slope, roughness and craters' },
  thermal: { name: 'Thermal', blurb: 'Illumination and soil composition' },
  habitat: { name: 'Habitat / caves', blurb: 'Natural shelter in lava tubes' },
}
export function localCatalog(lang: 'es' | 'en'): { dims: Dimension[]; profiles: Profile[] } {
  if (lang === 'es') return { dims: DIMS, profiles: PROFILES }
  return {
    dims: DIMS.map((d) => ({ ...d, ...DIMS_EN[d.key], short: DIMS_EN[d.key]?.name ?? d.short })),
    profiles: PROFILES.map((p) => ({ ...p, ...PROFILES_EN[p.id] })),
  }
}
