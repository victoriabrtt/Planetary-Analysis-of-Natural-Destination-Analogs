import { useStore, type Mode, type OffBody } from '../store/useStore'
import { MoonIcon, SunIcon } from './Icons'
import Segmented from './Segmented'
import { LANGS, useT, type Lang } from '../i18n'

/** Marca: dos cuerpos unidos por una órbita, el origen y su análogo. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden className="shrink-0">
      <path d="M4.5 17.5a9.5 9.5 0 0 1 15-11" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8.5" cy="14.5" r="5.5" className="fill-accent" />
      <circle cx="18" cy="6.5" r="3" fill="currentColor" />
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
  const lang = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
  const t = useT()
  const otherThe = t(body === 'moon' ? 'the.moon' : 'the.mars')

  const themeButton = (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('header.toLight') : t('header.toDark')}
      className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-(--line) text-(--muted) transition-colors hover:border-(--line-strong) hover:text-(--fg)"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )

  return (
    <header className="-mx-4 flex flex-col gap-3 border-b border-(--line) px-4 pb-4 sm:-mx-6 sm:px-6 md:flex-row md:items-center md:justify-between lg:-mx-8 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[20px] font-medium tracking-[-0.03em]">Analog Matcher</span>
          <span className="kicker hidden sm:inline">· NASA Space Apps 2026</span>
        </div>
        <div className="md:hidden">{themeButton}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Mode>
          id="mode"
          size="sm"
          ariaLabel={t('header.direction')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'forward', label: t('header.toEarth'), title: t('header.toEarthTitle', { body: otherThe }) },
            { value: 'inverse', label: t('header.fromEarth'), title: t('header.fromEarthTitle', { body: otherThe }) },
          ]}
        />
        <Segmented<OffBody>
          id="body"
          size="sm"
          ariaLabel={t('header.bodyGroup')}
          value={body}
          onChange={setBody}
          options={[
            { value: 'moon', label: t('body.moon') },
            { value: 'mars', label: t('body.mars') },
          ]}
        />
        <Segmented<Lang>
          id="lang"
          size="sm"
          ariaLabel={t('header.language')}
          value={lang}
          onChange={setLang}
          options={LANGS.map((l) => ({ value: l.value, label: <span lang={l.value}>{l.label}</span>, title: l.name }))}
        />
        <div className="hidden md:block">{themeButton}</div>
      </div>
    </header>
  )
}
