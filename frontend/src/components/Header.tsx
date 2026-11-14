import { USE_MOCK } from '../api/client'
import { useStore, type Mode, type OffBody } from '../store/useStore'
import { MoonIcon, SunIcon, SwapIcon } from './Icons'
import Segmented from './Segmented'

export default function Header() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const theme = useStore((s) => s.theme)
  const setMode = useStore((s) => s.setMode)
  const setBody = useStore((s) => s.setBody)
  const toggleTheme = useStore((s) => s.toggleTheme)

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-(--line-strong) bg-gradient-to-b from-[#1b2a4a] to-[#0b1222] shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_8px_24px_-8px_rgb(57_135_229/0.6)]">
          <span className="absolute h-4 w-4 rounded-full bg-gradient-to-br from-white to-[#9aa6bf]" style={{ transform: 'translate(-5px,-3px)' }} />
          <span className="absolute h-3 w-3 rounded-full bg-gradient-to-br from-[#7cc0ff] to-accent" style={{ transform: 'translate(6px,5px)' }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold tracking-[-0.02em]">Analog Matcher</h1>
            <span className="rounded-full border border-(--line-strong) px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-(--muted)">
              PANDA
            </span>
          </div>
          <p className="text-xs text-(--faint)">NASA Space Apps 2026 · Permanent Moon Base Locations and Mars</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Mode>
          id="mode"
          size="sm"
          ariaLabel="Dirección de la búsqueda"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'forward', label: <>{body === 'moon' ? 'Luna' : 'Marte'} → Tierra</> },
            {
              value: 'inverse',
              label: (
                <>
                  <SwapIcon width={13} height={13} /> Tierra → {body === 'moon' ? 'Luna' : 'Marte'}
                </>
              ),
            },
          ]}
        />
        <Segmented<OffBody>
          id="body"
          size="sm"
          ariaLabel="Cuerpo celeste"
          value={body}
          onChange={setBody}
          options={[
            { value: 'moon', label: <><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-white to-[#8b93a7]" />Luna</> },
            { value: 'mars', label: <><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#ffb38a] to-[#c1440e]" />Marte</> },
          ]}
        />
        <span
          className="hidden h-8 items-center gap-1.5 rounded-full border border-(--line) px-3 text-[11.5px] font-medium text-(--muted) sm:inline-flex"
          title={USE_MOCK ? 'Calculando en el navegador con el motor real sobre el dataset semilla' : 'Conectado a POST /api/match'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${USE_MOCK ? 'bg-moderate' : 'bg-strong'}`} />
          {USE_MOCK ? 'Motor local' : 'API'}
        </span>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="press grid h-10 w-10 place-items-center rounded-full border border-(--line) bg-(--glass) text-(--muted) backdrop-blur-xl hover:text-(--fg)"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}
