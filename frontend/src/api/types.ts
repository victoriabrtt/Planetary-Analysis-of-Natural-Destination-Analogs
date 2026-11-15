// Contrato de POST /api/match (backend FastAPI).
import type { Body } from '../engine/data'
import type { DimKey, DimMeta, Weights } from '../engine/dimensions'

export interface MatchRequest {
  source_body: Body
  lat: number
  lon: number
  target_body: Body
  top_n: number
  weights: Weights
  /** Opcional (extensión): idioma de textos y nombres de la respuesta. Por defecto "es". */
  lang?: 'es' | 'en'
}

export interface SiteRef {
  name: string
  lat: number
  lon: number
}

export interface DimMatch {
  site: SiteRef
  score: number
  /** Valor absoluto en el origen (unidades reales). */
  src: number
  /** Valor absoluto en el análogo (unidades reales). */
  match: number
  /** |src - match| en unidades reales. */
  diff: number
  /** Opcional (extensión): tolerancia usada por el backend para esta dimensión. */
  tol?: number
}

export interface MatchResponse {
  source: { body: Body; lat: number; lon: number; /** opcional: nombre del sitio si es conocido */ name?: string }
  overall: {
    site: SiteRef
    score: number
    /** Opcional (extensión): cómo le va al ganador global en cada dimensión. */
    perDim?: Record<DimKey, CandidateDim>
    /** Opcional (extensión): cuánto del cuerpo destino califica como "Fuerte" (global ≥ 0,75). */
    qualifying?: { count: number; share: number; sample: [number, number][] }
  }
  perDim: Record<DimKey, DimMatch>
  caveats: string[]
  /** Opcional (extensión): top_n candidatos por cercanía global. La UI funciona sin esto. */
  ranking?: { site: SiteRef; score: number; perDim?: Record<DimKey, CandidateDim> }[]
}

/** Cómo le va a un lugar candidato en una dimensión. */
export interface CandidateDim {
  match: number
  diff: number
  score: number
}

/** GET /api/meta (solo backend real). */
export interface MetaResponse {
  dims: DimMeta[]
  profiles: { id: string; name: string; blurb: string; weights: Record<string, number> }[]
  /** Celdas precalculadas por cuerpo (el dato duro de la portada). */
  bodies?: Record<string, { cells: number; cell_km: number; source: string }>
}
