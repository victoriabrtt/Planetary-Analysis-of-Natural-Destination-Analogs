import type { SiteRef } from '../api/types'
import type { Body } from '../engine/data'
import type { Key } from '../i18n'
import { distKm, fmtNum, isUnnamed } from './format'

type T = (key: Key, vars?: Record<string, string | number>) => string

export const RADIUS_KM: Record<Body, number> = { earth: 6371, moon: 1737.4, mars: 3389.5 }

/** Título legible: las celdas sin nombre no repiten sus coordenadas como título. */
export const placeTitle = (name: string, t: T) => (isUnnamed(name) ? t('unnamed') : name)

/** Nombres del ranking sin ambigüedad: si un nombre ya apareció más arriba, se le agrega
 *  "a 600 km del n.º 1" (dos celdas de la misma cordillera no se confunden). */
export function rankLabels(ranking: { site: SiteRef }[], body: Body, t: T): string[] {
  return ranking.map((r, i) => {
    const name = placeTitle(r.site.name, t)
    const j = ranking.findIndex((o) => o.site.name === r.site.name)
    if (j === i) return name
    const km = distKm(r.site, ranking[j].site, RADIUS_KM[body])
    return `${name} · ${t('ranking.near', { km: fmtNum(Math.round(km / 10) * 10), n: j + 1 })}`
  })
}
