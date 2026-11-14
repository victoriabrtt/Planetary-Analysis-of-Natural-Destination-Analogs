import { MotionConfig, motion } from 'framer-motion'
import { useEffect } from 'react'
import Caveats from './components/Caveats'
import DimensionCard from './components/DimensionCard'
import { SourcePanel, TargetPanel } from './components/GlobePanel'
import Header from './components/Header'
import { ArrowIcon } from './components/Icons'
import ProfileSelector from './components/ProfileSelector'
import Ranking from './components/Ranking'
import ResultHero from './components/ResultHero'
import Starfield from './components/Starfield'
import { BODY_THE } from './engine/data'
import { VERDICTS, verdictOf } from './engine/dimensions'
import { pct } from './lib/format'
import { spring } from './lib/motion'
import { resultDims, sourceBodyOf, targetBodyOf, useActiveProfile, useStore } from './store/useStore'

function Connector() {
  const result = useStore((s) => s.result)
  const score = result?.overall.score ?? 0
  const v = VERDICTS[verdictOf(score)]
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:block" aria-hidden>
      <motion.div
        layout
        transition={spring}
        className="glass flex items-center gap-2 !rounded-full px-3.5 py-2"
        style={{ boxShadow: `0 0 40px -6px ${v.color}88, inset 0 1px 0 var(--line-top)` }}
      >
        <ArrowIcon className="text-(--muted)" />
        <span className="tnum text-sm font-semibold">{result ? `${pct(score)}%` : '—'}</span>
      </motion.div>
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
      <Starfield />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <Header />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="max-w-3xl pt-2"
        >
          <h2 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[48px]">
            El Shazam de los{' '}
            <span className="bg-gradient-to-r from-[#9cc7ff] via-accent to-[#5eead4] bg-clip-text text-transparent">análogos planetarios</span>.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-(--muted) sm:text-base">
            Elegí un punto en {BODY_THE[src]} y encontramos el lugar de {BODY_THE[tgt]} con la huella más parecida.{' '}
            <span className="text-(--fg)">
              ¿Este lugar es tan extremo para la Tierra como aquel lo es para {BODY_THE[body]}?
            </span>
          </p>
        </motion.div>

        <div className="relative grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <SourcePanel />
          <TargetPanel />
          <Connector />
        </div>

        {error && (
          <div role="alert" className="glass border-broken/50 px-5 py-3 text-sm">
            <span className="font-semibold">Sin resultado para este punto.</span>{' '}
            <span className="text-(--muted)">{error} Elegí otro punto o un atajo.</span>
          </div>
        )}

        <div id="resultados" tabIndex={-1} className="scroll-mt-6 outline-none">
          <ProfileSelector />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] [&>*]:min-w-0">
          <ResultHero />
          <Ranking />
        </div>

        <section aria-label="Cercanía por dimensión">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="kicker">Por dimensión</div>
              <p className="mt-0.5 text-sm text-(--muted)">
                El mejor análogo para cada dimensión, en valores absolutos reales. Pasá el mouse para verlo en el globo.
              </p>
            </div>
          </div>
          <div className={`grid gap-4 sm:grid-cols-2 ${dims.length % 3 === 0 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
            {result
              ? dims.map((d, i) => (
                  <DimensionCard
                    key={d.key}
                    dim={d}
                    m={result.perDim[d.key]}
                    weight={profile.weights[d.key] ?? 1}
                    sourceBody={src}
                    targetBody={tgt}
                    index={i}
                  />
                ))
              : dims.map((d) => <div key={d.key} className="glass h-[290px] motion-safe:animate-pulse" />)}
          </div>
        </section>

        <Caveats />

        <footer className="flex flex-col gap-1 pb-4 pt-2 text-xs text-(--faint) sm:flex-row sm:justify-between">
          <span>
            Cercanía por dimensión = exp(−(|a − b| / tolerancia)²) · global = promedio ponderado por perfil.
          </span>
          <span>Texturas: Solar System Scope (CC BY 4.0) · Polos lunares: LROC WAC, NASA/GSFC/ASU · NASA Space Apps 2026</span>
        </footer>
      </div>
    </MotionConfig>
  )
}
