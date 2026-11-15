// ÚNICO punto para cambiar entre mock y API real.
// Mock por defecto. Para usar el backend: VITE_API_MODE=real (ver .env.example).
import { computeMatch } from '../engine/match'
import type { MatchRequest, MatchResponse, MetaResponse } from './types'

export const USE_MOCK = import.meta.env.VITE_API_MODE !== 'real'
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

/** Error de la API con el punto con datos más cercano, si el backend lo informa (ej. océano). */
export class ApiError extends Error {
  nearest: { lat: number; lon: number; km: number } | null
  constructor(message: string, nearest: ApiError['nearest'] = null) {
    super(message)
    this.nearest = nearest
  }
}

export async function matchAnalogs(req: MatchRequest, signal?: AbortSignal): Promise<MatchResponse> {
  if (USE_MOCK) {
    // Mock con la forma exacta del contrato; calcula con el motor real en el cliente.
    return computeMatch(req)
  }
  const res = await fetch(`${API_BASE}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })
  if (!res.ok) throw await apiError(res)
  return res.json()
}

/** Dimensiones, tolerancias y perfiles que define el backend. En modo mock no se llama. */
export async function fetchMeta(lang: 'es' | 'en' = 'es'): Promise<MetaResponse> {
  const res = await fetch(`${API_BASE}/api/meta?lang=${lang}`)
  if (!res.ok) throw await apiError(res)
  return res.json()
}

async function apiError(res: Response): Promise<ApiError> {
  const text = await res.text()
  try {
    const j = JSON.parse(text)
    if (typeof j.detail === 'string') return new ApiError(j.detail)
    if (j.detail?.message) return new ApiError(j.detail.message, j.detail.nearest ?? null)
  } catch {
    /* no es JSON */
  }
  return new ApiError(
    document.documentElement.lang === 'en'
      ? `Could not reach the server (error ${res.status}). Try again in a moment.`
      : `No se pudo consultar el servidor (error ${res.status}). Probá de nuevo en un momento.`,
  )
}
