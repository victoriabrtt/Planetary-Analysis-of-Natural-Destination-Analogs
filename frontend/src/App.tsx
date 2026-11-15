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
import Method from './components/Method'
import Reading from './components/Reading'
import ResultActions from './components/ResultActions'
import { startUrlSync } from './lib/urlState'
import { fmtCoord } from './lib/format'
import { spring } from './lib/motion'
import { useDelayedFlag } from './lib/useDelayedFlag'
import { resultDims, useActiveProfile, useCandidate, useStore } from './store/useStore'

export default function App() {
  const theme = useStore((s) => s.theme)
  const result = useStore((s) => s.result)
  const catalog = useStore((s) => s.dims)
  const init = useStore((s) => s.init)
  const profile = useActiveProfile()
  const cand = useCandidate()
  const dims = resultDims(catalog, result)
  const calculating = useDelayedFlag(useStore((s) => s.loading))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const stop = startUrlSync() // la URL describe la consulta: enlace compartible y "atrás" deshace
    void init()
    return stop
  }, [init])

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <a href="#analogo" className="skip-link">
        Saltar al resultado
      </a>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Header />
        <main className="flex flex-col gap-6">
          <Intro />

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <SourcePanel />
            <TargetPanel />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <Reading />
            <ResultActions />
          </div>

          {result && (
            <>

              <div
                aria-busy={calculating}
                className={`grid gap-x-8 gap-y-10 pt-4 transition-opacity duration-200 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)] ${calculating ? 'opacity-50' : ''}`}
              >
                <div className="flex min-w-0 flex-col gap-6">
                  <ProfileSelector />
                  <Ranking />
                  <Caveats compact />
                </div>
    
                <section aria-labelledby="dims-title" className="min-w-0">
                  <h2 id="dims-title" className="display text-[24px] [text-wrap:balance]">
                    Medida por medida
                  </h2>
                  <p className="mt-1 text-[16px] text-(--muted)">
                    El anillo es {result?.source.name ?? 'el origen'}, el punto de color es {cand?.site.name ?? 'el análogo'} y la
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
                              winner={cand?.perDim[d.key] ?? { match: best.match, diff: best.diff, score: best.score }}
                              sourceName={result.source.name ?? fmtCoord(result.source.lat, result.source.lon)}
                              winnerName={cand?.site.name ?? result.overall.site.name}
                              weight={profile.weights[d.key] ?? 1}
                            />
                          )
                        })
                      : null}
                  </div>
                  <div className="mt-6">
                    <Method />
                  </div>
                </section>
              </div>
            </>
          )}
        </main>

        <footer className="kicker flex flex-col gap-1 border-t border-(--line) pb-2 pt-5 sm:flex-row sm:justify-between">
          <span>{USE_MOCK ? 'Motor local de demostración' : 'Datos: LOLA (Luna), MOLA (Marte), ETOPO 2022 (Tierra)'}</span>
          <span>Texturas: Solar System Scope (CC BY 4.0) · Polos lunares: LROC WAC, NASA/GSFC/ASU</span>
        </footer>
      </div>
    </MotionConfig>
  )
}
