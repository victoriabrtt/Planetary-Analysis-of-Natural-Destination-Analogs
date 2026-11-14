import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import Caveats from './components/Caveats'
import DimensionCard from './components/DimensionCard'
import { SourcePanel, TargetPanel } from './components/GlobePanel'
import Header from './components/Header'
import { ArrowIcon } from './components/Icons'
import Intro from './components/Intro'
import ProfileSelector from './components/ProfileSelector'
import Ranking from './components/Ranking'
import ResultHero from './components/ResultHero'
import { pct } from './lib/format'
import { spring } from './lib/motion'
import { resultDims, sourceBodyOf, targetBodyOf, useActiveProfile, useStore } from './store/useStore'

/** Entre los dos globos: la cercanía global, en una pastilla sólida (sin brillo). */
function Connector() {
  const result = useStore((s) => s.result)
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:block" aria-hidden>
      <div className="flex items-center gap-2 rounded-lg border border-(--line-strong) bg-(--card) px-3 py-1.5">
        <ArrowIcon className="text-(--muted)" />
        <span className="tnum text-[14px]">{result ? `${pct(result.overall.score)}%` : '—'}</span>
      </div>
    </div>
  )
}

export default function App() {
  const theme = useStore((s) => s.theme)
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const result = useStore((s) => s.result)
  const error = useStore((s) => s.error)
  const catalog = useStore((s) => s.dims)
  const init = useStore((s) => s.init)
  const profile = useActiveProfile()
  const dims = resultDims(catalog, result)
  const src = sourceBodyOf(mode, body)
  const tgt = targetBodyOf(mode, body)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    void init()
  }, [init])

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <a href="#resultados" className="skip-link">
        Saltar a los resultados
      </a>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Header />
        <main className="flex flex-col gap-6">
          <Intro />

          <div className="relative grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <SourcePanel />
            <TargetPanel />
            <Connector />
          </div>

          {error && (
            <div role="alert" className="card border-broken/50 px-6 py-4 text-[16px]">
              <span className="font-medium">Sin resultado para este punto.</span>{' '}
              <span className="text-(--muted)">{error} Elegí otro punto o un sitio de la lista.</span>
            </div>
          )}

          <div className="pt-6">
            <ProfileSelector />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] [&>*]:min-w-0">
            <ResultHero />
            <Ranking />
          </div>

          <section aria-labelledby="dims-title" className="pt-6">
            <h2 id="dims-title" className="display max-w-[46rem] text-[24px]">
              Cercanía por dimensión. <span className="text-(--muted)">El mejor análogo para cada medida, con sus valores reales.</span>
            </h2>
            <div className={`mt-6 grid gap-4 sm:grid-cols-2 ${dims.length % 3 === 0 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
              {result
                ? dims.map((d) => (
                    <DimensionCard
                      key={d.key}
                      dim={d}
                      m={result.perDim[d.key]}
                      weight={profile.weights[d.key] ?? 1}
                      sourceBody={src}
                      targetBody={tgt}
                    />
                  ))
                : dims.map((d) => <div key={d.key} className="card h-[320px] motion-safe:animate-pulse" />)}
            </div>
          </section>

          <Caveats />
        </main>

        <footer className="kicker flex flex-col gap-1 border-t border-(--line) pb-2 pt-5 sm:flex-row sm:justify-between">
          <span className="tnum">cercanía = exp(−(|a − b| / tol)²) · global = promedio ponderado por perfil</span>
          <span>Texturas: Solar System Scope (CC BY 4.0) · Polos lunares: LROC WAC, NASA/GSFC/ASU</span>
        </footer>
      </div>
    </MotionConfig>
  )
}
