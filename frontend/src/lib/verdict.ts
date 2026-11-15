import type { CandidateDim } from '../api/types'
import { verdictOf, type Dimension, type VerdictKey } from '../engine/dimensions'

export interface Qualified {
  /** Veredicto global (sobre el % que se muestra). */
  k: VerdictKey
  /** Medidas en "Fuerte". */
  ok: number
  n: number
  /** Medidas que se rompen y las que se alejan sin romperse (Moderado o Débil). */
  broken: Dimension[]
  drifting: Dimension[]
  /** El promedio da Fuerte pero alguna medida se rompe: el veredicto se califica ("Fuerte en 3 de 4"). */
  qualified: boolean
}

/** Una sola definición del veredicto calificado, para el panel, el ranking y la lectura:
 *  el promedio nunca esconde una medida que se rompe. */
export function qualify(score: number, perDim: Record<string, CandidateDim>, dims: Dimension[]): Qualified {
  const ks = dims.map((d) => ({ d, k: perDim[d.key] ? verdictOf(perDim[d.key].score) : 'strong' }))
  const broken = ks.filter((x) => x.k === 'broken').map((x) => x.d)
  const drifting = ks.filter((x) => x.k === 'moderate' || x.k === 'weak').map((x) => x.d)
  const k = verdictOf(score)
  return {
    k,
    ok: ks.filter((x) => x.k === 'strong').length,
    n: dims.length,
    broken,
    drifting,
    qualified: k === 'strong' && broken.length > 0,
  }
}

/** "a, b y c" / "a, b and c". */
export function listJoin(xs: string[], lang: 'es' | 'en'): string {
  if (xs.length < 2) return xs.join('')
  return `${xs.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'and'} ${xs.at(-1)}`
}
