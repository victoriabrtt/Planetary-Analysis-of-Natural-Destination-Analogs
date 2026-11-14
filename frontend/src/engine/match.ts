// Motor de cercanía: el algoritmo real, sobre el dataset semilla.
import { CAVEATS } from './data'
import { DIMS, closeness } from './dimensions'
import { candidates, fingerprint } from './fingerprint'
import type { DimMatch, MatchRequest, MatchResponse, SiteRef } from '../api/types'

export function computeMatch(req: MatchRequest): MatchResponse {
  const src = fingerprint(req.source_body, req.lat, req.lon)
  const totalW = DIMS.reduce((s, d) => s + Math.max(0, req.weights[d.key] ?? 1), 0) || 1

  const scored = candidates(req.target_body).map((c) => {
    const per = DIMS.map((d, i) => closeness(src.vals[i], c.vals[i], d.tol))
    const total = DIMS.reduce((s, d, i) => s + Math.max(0, req.weights[d.key] ?? 1) * per[i], 0) / totalW
    return { c, per, total }
  })
  scored.sort((a, b) => b.total - a.total)

  const ref = (s: { name: string; lat: number; lon: number }): SiteRef => ({ name: s.name, lat: s.lat, lon: s.lon })
  const rnd = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d
  /** Valores como se muestran y la diferencia entre ESOS valores (18° vs 19° no da 0°). */
  const pair = (i: number, a: number, b: number) => {
    const d = DIMS[i].decimals
    const ra = rnd(a, d)
    const rb = rnd(b, d)
    return { src: ra, match: rb, diff: rnd(Math.abs(ra - rb), d) }
  }

  const perDim = Object.fromEntries(
    DIMS.map((d, i) => {
      // Mejor por dimensión; desempate por cercanía global.
      let best = scored[0]
      for (const s of scored) {
        if (s.per[i] > best.per[i] + 1e-9) best = s
      }
      const m: DimMatch = { site: ref(best.c), score: best.per[i], ...pair(i, src.vals[i], best.c.vals[i]) }
      return [d.key, m]
    }),
  ) as MatchResponse['perDim']

  return {
    source: { body: req.source_body, lat: req.lat, lon: req.lon, name: src.name },
    overall: {
      site: ref(scored[0].c),
      score: scored[0].total,
      perDim: Object.fromEntries(
        DIMS.map((d, i) => {
          const { match, diff } = pair(i, src.vals[i], scored[0].c.vals[i])
          return [d.key, { match, diff, score: scored[0].per[i] }]
        }),
      ),
    },
    perDim,
    caveats: CAVEATS,
    ranking: scored.slice(0, req.top_n).map((s) => ({ site: ref(s.c), score: s.total })),
  }
}
