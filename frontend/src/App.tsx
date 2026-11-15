import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import { USE_MOCK } from './api/client'
import Caveats from './components/Caveats'
import DimensionCard from './components/DimensionCard'
import { SourcePanel, TargetPanel } from './components/GlobePanel'
import Header from './components/Header'
import Intro from './components/Intro'
import Method from './components/Method'
import ProfileSelector from './components/ProfileSelector'
import Ranking from './components/Ranking'
import Reading from './components/Reading'
import ResultActions from './components/ResultActions'
import { useT } from './i18n'
import { fmtCoord } from './lib/format'
import { placeTitle } from './lib/labels'
import { spring } from './lib/motion'
import { useDelayedFlag } from './lib/useDelayedFlag'
import { startUrlSync } from './lib/urlState'
import { resultDims, useActiveProfile, useCandidate, useStore } from './store/useStore'

export default function App() {
  const t = useT()
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

  const srcName = result ? (result.source.name ? placeTitle(result.source.name, t) : fmtCoord(result.source.lat, result.source.lon)) : ''
  const candName = cand ? placeTitle(cand.site.name, t) : ''

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <a href="#analogo" className="skip-link">
        {t('skip')}
      </a>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Header />
        <main className="flex flex-col gap-6">
          <Intro />
          <ProfileSelector />

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <SourcePanel />
            <TargetPanel />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <Reading />
            <ResultActions />
          </div>

          {result && (
            <div aria-busy={calculating} className={`flex flex-col gap-12 pt-4 transition-opacity duration-200 ${calculating ? 'opacity-50' : ''}`}>
              <section aria-labelledby="dims-title">
                <h2 id="dims-title" className="display text-[24px]">
                  {t('dims.title')}
                </h2>
                <p className="mt-1 max-w-[52rem] text-[16px] text-(--muted)">
                  {t('dims.legend', { src: srcName || t('dims.source'), tgt: candName || t('dims.target') })}
                </p>
                <div className={`mt-5 grid gap-4 sm:grid-cols-2 [&>*]:min-w-0 ${dims.length % 4 === 0 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
                  {dims.map((d) => {
                    const best = result.perDim[d.key]
                    return (
                      <DimensionCard
                        key={d.key}
                        dim={d}
                        best={best}
                        winner={cand?.perDim[d.key] ?? { match: best.match, diff: best.diff, score: best.score }}
                        sourceName={srcName}
                        winnerName={candName}
                        weight={profile.weights[d.key] ?? 1}
                      />
                    )
                  })}
                </div>
              </section>

              <div className="grid gap-x-12 gap-y-12 lg:grid-cols-2 [&>*]:min-w-0">
                <Ranking />
                <Caveats compact />
              </div>

              <Method />
            </div>
          )}
        </main>

        <footer className="kicker flex flex-col gap-1 border-t border-(--line) pb-2 pt-5 sm:flex-row sm:justify-between">
          <span>{USE_MOCK ? t('footer.mock') : t('footer.data')}</span>
          <span>{t('footer.textures')}</span>
        </footer>
      </div>
    </MotionConfig>
  )
}
