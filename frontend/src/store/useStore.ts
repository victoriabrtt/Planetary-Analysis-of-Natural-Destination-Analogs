import { create } from 'zustand'
import { ApiError, USE_MOCK, fetchMeta, matchAnalogs } from '../api/client'
import type { CandidateDim, MatchResponse, SiteRef } from '../api/types'
import { EARTH, FAMOUS, type Body } from '../engine/data'
import { DIMS, PROFILES, dimFromMeta, fallbackDim, profileWeights, type DimKey, type Dimension, type Profile } from '../engine/dimensions'

export type Mode = 'forward' | 'inverse'
export type OffBody = 'moon' | 'mars'
export type Theme = 'dark' | 'light'

interface Point {
  lat: number
  lon: number
}

interface State {
  mode: Mode
  body: OffBody
  profileId: string
  point: Point
  result: MatchResponse | null
  loading: boolean
  error: string | null
  /** Punto con datos más cercano cuando el elegido no tiene (ej. océano). */
  errorNearest: { lat: number; lon: number; km: number } | null
  hoveredDim: DimKey | null
  /** Puesto del ranking que se está mirando (null = el ganador). Cambia el panel, las cards y el globo. */
  inspectIdx: number | null
  theme: Theme
  /** Catálogo activo: local (mock) o el que define el backend (GET /api/meta). */
  dims: Dimension[]
  profiles: Profile[]
  /** Índices del backend (null en modo mock). */
  bodies: Record<string, { cells: number; cell_km: number; source: string }> | null

  init: () => Promise<void>
  setMode: (m: Mode) => void
  setBody: (b: OffBody) => void
  setProfile: (id: string) => void
  selectPoint: (lat: number, lon: number) => void
  setHoveredDim: (d: DimKey | null) => void
  setInspect: (i: number | null) => void
  toggleTheme: () => void
  run: () => Promise<void>
}

export const sourceBodyOf = (mode: Mode, body: OffBody): Body => (mode === 'forward' ? body : 'earth')
export const targetBodyOf = (mode: Mode, body: OffBody): Body => (mode === 'forward' ? 'earth' : body)

function defaultPoint(mode: Mode, body: OffBody): Point {
  if (mode === 'inverse') return { lat: EARTH[4].lat, lon: EARTH[4].lon } // Axel Heiberg
  const f = body === 'moon' ? FAMOUS.moon[1] : FAMOUS.mars[0] // Shackleton / Jezero
  return { lat: f.lat, lon: f.lon }
}

// Oscuro por defecto; el claro es opcional y se recuerda.
const initialTheme: Theme =
  typeof localStorage !== 'undefined' && localStorage.getItem('theme') === 'light' ? 'light' : 'dark'

let reqId = 0
let controller: AbortController | null = null

export const useStore = create<State>((set, get) => ({
  mode: 'forward',
  body: 'moon',
  profileId: 'balanced',
  point: defaultPoint('forward', 'moon'),
  result: null,
  loading: false,
  error: null,
  errorNearest: null,
  hoveredDim: null,
  inspectIdx: null,
  theme: initialTheme,
  dims: DIMS,
  profiles: PROFILES,
  bodies: null,

  init: async () => {
    if (!USE_MOCK) {
      try {
        const meta = await fetchMeta()
        const profiles = meta.profiles.length ? meta.profiles : PROFILES
        set({
          dims: meta.dims.map(dimFromMeta),
          profiles,
          bodies: meta.bodies ?? null,
          profileId: profiles.some((p) => p.id === get().profileId) ? get().profileId : profiles[0].id,
        })
      } catch (e) {
        set({ error: `No se pudo leer /api/meta: ${e instanceof Error ? e.message : String(e)}` })
        return
      }
    }
    await get().run()
  },

  setMode: (mode) => {
    if (mode === get().mode) return
    set({ mode, point: defaultPoint(mode, get().body), result: null })
    void get().run()
  },
  setBody: (body) => {
    if (body === get().body) return
    const { mode } = get()
    // En modo inverso el origen es la Tierra: se mantiene el punto, cambia el destino.
    set({ body, point: mode === 'forward' ? defaultPoint(mode, body) : get().point, result: null })
    void get().run()
  },
  setProfile: (profileId) => {
    set({ profileId })
    void get().run()
  },
  selectPoint: (lat, lon) => {
    set({ point: { lat, lon } })
    void get().run()
  },
  setHoveredDim: (hoveredDim) => set({ hoveredDim }),
  setInspect: (i) => set({ inspectIdx: i && i > 0 ? i : null }),
  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', theme)
    set({ theme })
  },

  run: async () => {
    const { mode, body, profileId, point, profiles, dims } = get()
    const profile = profiles.find((p) => p.id === profileId) ?? profiles[0]
    const id = ++reqId
    controller?.abort()
    controller = new AbortController()
    set({ loading: true, error: null, errorNearest: null, inspectIdx: null })
    try {
      const result = await matchAnalogs(
        {
          source_body: sourceBodyOf(mode, body),
          lat: point.lat,
          lon: point.lon,
          target_body: targetBodyOf(mode, body),
          top_n: 5,
          weights: profileWeights(profile, dims),
        },
        controller.signal,
      )
      if (id === reqId) set({ result, loading: false })
    } catch (e) {
      if (id !== reqId || (e instanceof DOMException && e.name === 'AbortError')) return
      set({
        loading: false,
        result: null,
        error: e instanceof Error ? e.message : String(e),
        errorNearest: e instanceof ApiError ? e.nearest : null,
      })
    }
  },
}))

/** Dimensiones a mostrar para un resultado: las del catálogo que vinieron, más cualquier clave desconocida. */
export function resultDims(dims: Dimension[], result: MatchResponse | null): Dimension[] {
  if (!result) return dims
  const known = dims.filter((d) => result.perDim[d.key])
  const extra = Object.keys(result.perDim)
    .filter((k) => !dims.some((d) => d.key === k))
    .map((k, i) => fallbackDim(k, known.length + i))
  return [...known, ...extra]
}

export function useActiveProfile(): Profile {
  const profiles = useStore((s) => s.profiles)
  const id = useStore((s) => s.profileId)
  return profiles.find((p) => p.id === id) ?? profiles[0]
}

export interface Candidate {
  site: SiteRef
  score: number
  /** 1 = el ganador */
  rank: number
  perDim: Record<DimKey, CandidateDim>
}

/** El lugar que se está mirando: el ganador, o el puesto del ranking que se tocó. */
export function useCandidate(): Candidate | null {
  const result = useStore((s) => s.result)
  const idx = useStore((s) => s.inspectIdx)
  if (!result) return null
  const fallbackDims = Object.fromEntries(
    Object.entries(result.perDim).map(([k, m]) => [k, { match: m.match, diff: m.diff, score: m.score }]),
  )
  const r = idx != null ? result.ranking?.[idx] : undefined
  if (r) return { site: r.site, score: r.score, rank: idx! + 1, perDim: r.perDim ?? fallbackDims }
  return { site: result.overall.site, score: result.overall.score, rank: 1, perDim: result.overall.perDim ?? fallbackDims }
}
