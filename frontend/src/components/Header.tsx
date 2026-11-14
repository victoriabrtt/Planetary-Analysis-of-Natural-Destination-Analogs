import { USE_MOCK } from '../api/client'
import { useStore, type Mode, type OffBody } from '../store/useStore'
import { MoonIcon, SunIcon } from './Icons'
import Segmented from './Segmented'

/** Marca repartida por la skill (data-mark="dots"): tres círculos y un cuadrado, en el acento. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className="shrink-0 text-accent">
      <circle cx="6.5" cy="6.5" r="4.5" fill="currentColor" />
      <circle cx="17.5" cy="6.5" r="4.5" fill="currentColor" />
      <circle cx="6.5" cy="17.5" r="4.5" fill="currentColor" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" />
    </svg>
  )
}

export default function Header() {
  const mode = useStore((s) => s.mode)
  const body = useStore((s) => s.body)
  const theme = useStore((s) => s.theme)
  const setMode = useStore((s) => s.setMode)
  const setBody = useStore((s) => s.setBody)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const other = body === 'moon' ? 'Luna' : 'Marte'

  return (
    <header className="-mx-4 flex flex-col gap-3 border-b border-(--line) px-4 pb-4 sm:-mx-6 sm:px-6 md:flex-row md:items-center md:justify-between lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-2.5">
        <Mark />
        <span className="text-[20px] font-medium tracking-[-0.03em]">Analog Matcher</span>
        <span className="kicker hidden sm:inline">· NASA Space Apps 2026</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Mode>
          id="mode"
          size="sm"
          ariaLabel="Dirección de la búsqueda"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'forward', label: `${other} → Tierra` },
            { value: 'inverse', label: `Tierra → ${other}` },
          ]}
        />
        <Segmented<OffBody>
          id="body"
          size="sm"
          ariaLabel="Cuerpo celeste"
          value={body}
          onChange={setBody}
          options={[
            { value: 'moon', label: 'Luna' },
            { value: 'mars', label: 'Marte' },
          ]}
        />
        <span
          className="kicker hidden h-8 items-center gap-1.5 px-1 sm:inline-flex"
          title={USE_MOCK ? 'Calculando en el navegador con el motor local' : 'Conectado a POST /api/match'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${USE_MOCK ? 'bg-moderate' : 'bg-strong'}`} aria-hidden />
          {USE_MOCK ? 'Motor local' : 'API'}
        </span>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="press grid h-9 w-9 place-items-center rounded-lg border border-(--line) text-(--muted) transition-colors hover:border-(--line-strong) hover:text-(--fg)"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}
