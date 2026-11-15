import { useStore } from '../store/useStore'
import { fmtVal } from '../lib/format'

/** "Cómo se calcula": la explicación al alcance, sin ocupar lugar hasta que se pide. */
export default function Method() {
  const dims = useStore((s) => s.dims)
  return (
    <details className="group rounded-[14px] border border-(--line) px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="press flex cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-medium">
        Cómo se calcula
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className="text-(--muted) transition-transform group-open:rotate-180">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-(--muted)">
        <p>
          Se compara la <span className="text-(--fg)">forma</span> del terreno, no la altura: cada cuerpo mide la altura desde un cero
          distinto (nivel del mar, una esfera, el areoide). Cada lugar es una celda de unos 20 km.
        </p>
        <p>
          En cada medida, la cercanía es 100% si los valores son iguales y baja a medida que la diferencia se acerca a su{' '}
          <span className="text-(--fg)">tolerancia</span>:{' '}
          {dims.map((d, i) => (
            <span key={d.key}>
              {d.name.toLowerCase()} ±<span className="tnum">{fmtVal(d, d.tol)}</span>
              {i < dims.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </p>
        <p>
          La cercanía global promedia las medidas con los pesos del perfil. Veredicto: <span className="text-(--fg)">Fuerte</span> desde
          75%, <span className="text-(--fg)">Moderado</span> desde 50%, <span className="text-(--fg)">Débil</span> desde 25%; debajo,{' '}
          <span className="text-(--fg)">se rompe</span>.
        </p>
        <p className="tnum text-[13px]">cercanía = exp(−(|a − b| / tolerancia)²) · datos: LOLA, MOLA, ETOPO 2022</p>
      </div>
    </details>
  )
}
