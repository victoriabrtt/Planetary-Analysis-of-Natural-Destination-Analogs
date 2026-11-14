import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import { USE_MOCK } from './api/client'
import Caveats from './components/Caveats'
import DimensionCard from './components/DimensionCard'
import { SourcePanel, TargetPanel } from './components/GlobePanel'
import Header from './components/Header'
import Intro from './components/Intro'
import ProfileSelector from './components/ProfileSelector'
import Ranking from './components/Ranking'
import Reading from './components/Reading'
import { fmtCoord } from './lib/format'
import { spring } from './lib/motion'
import { useDelayedFlag } from './lib/useDelayedFlag'
import { resultDims, useActiveProfile, useStore } from './store/useStore'

export default function App() {
  const theme = useStore((s) => s.theme)
  const result = useStore((s) => s.result)
  const catalog = useStore((s) => s.dims)
  const init = useStore((s) => s.init)
  const profile = useActiveProfile()
  const dims = resultDims(catalog, result)
  const calculating = useDelayedFlag(useStore((s) => s.loading))

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

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <SourcePanel />
            <TargetPanel />
          </div>

          <Reading />

          <div
            aria-busy={calculating}
            className={`grid gap-x-8 gap-y-10 pt-4 transition-opacity duration-200 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)] ${calculating ? 'opacity-50' : ''}`}
          >
            <div className="flex min-w-0 flex-col gap-6">
              <ProfileSelector />
              <Ranking />
            </div>

            <section aria-labelledby="dims-title" className="min-w-0">
              <h2 id="dims-title" className="display text-[24px] [text-wrap:balance]">
                Medida por medida
              </h2>
              <p className="mt-1 text-[16px] text-(--muted)">
                El anillo es {result?.source.name ?? 'el origen'}, el punto de color es {result?.overall.site.name ?? 'el análogo'} y la
                franja gris es la tolerancia de cada medida.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                {result
                  ? dims.map((d) => {
                      const best = result.perDim[d.key]
                      return (
                        <DimensionCard
                          key={d.key}
                          dim={d}
                          best={best}
                          winner={result.overall.perDim?.[d.key] ?? { match: best.match, diff: best.diff, score: best.score }}
                          sourceName={result.source.name ?? fmtCoord(result.source.lat, result.source.lon)}
                          winnerName={result.overall.site.name}
                          weight={profile.weights[d.key] ?? 1}
                        />
                      )
                    })
                  : null}
              </div>
            </section>
          </div>

          <Caveats />
        </main>

        <footer className="kicker flex flex-col gap-1 border-t border-(--line) pb-2 pt-5 sm:flex-row sm:justify-between">
          <span className="tnum">
            cercanía = exp(−(|a − b| / tol)²) · global = promedio ponderado por perfil ·{' '}
            {USE_MOCK ? 'motor local de demostración' : 'datos: LOLA, MOLA, ETOPO 2022'}
          </span>
          <span>Texturas: Solar System Scope (CC BY 4.0) · Polos lunares: LROC WAC, NASA/GSFC/ASU</span>
        </footer>
      </div>
    </MotionConfig>
  )
}
