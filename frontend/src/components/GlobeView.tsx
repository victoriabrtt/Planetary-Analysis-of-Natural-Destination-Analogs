import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import type { Body } from '../engine/data'
import type { DimKey } from '../engine/dimensions'
import { createPolarGlobeMaterial } from '../lib/polarMaterial'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'

export type MarkerKind = 'famous' | 'selected' | 'overall' | 'dims' | 'origin'

export interface Marker {
  id: string
  lat: number
  lon: number
  kind: MarkerKind
  label?: string
  sub?: string
  colors?: string[]
  dims?: DimKey[]
  onClick?: () => void
}

export interface Arc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
}

interface Props {
  body: Body
  markers: Marker[]
  rings?: { lat: number; lng: number; color: string }[]
  arcs?: Arc[]
  focus?: { lat: number; lon: number; altitude?: number; key: string }
  highlightDim?: DimKey | null
  /** Celdas que califican como análogo fuerte: se dibujan como puntos tenues sobre la superficie. */
  dots?: [number, number][]
  onPick?: (lat: number, lon: number) => void
  ariaLabel: string
}

const TEXTURE: Record<Body, string> = {
  moon: '/textures/2k_moon.webp',
  mars: '/textures/2k_mars.webp',
  earth: '/textures/2k_earth_daymap.webp',
}
const ATMOS: Record<Body, { color: string; alt: number }> = {
  moon: { color: '#b8c4dd', alt: 0.12 },
  mars: { color: '#ff9a6b', alt: 0.16 },
  earth: { color: '#3987e5', alt: 0.2 },
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function render(el: HTMLElement, m: Marker) {
  el.className = `gm gm-${m.kind}`
  el.dataset.dims = (m.dims ?? []).join(' ')
  el.style.pointerEvents = m.onClick ? 'auto' : 'none'
  el.onclick = m.onClick
    ? (e) => {
        e.stopPropagation()
        m.onClick?.()
      }
    : null
  // Los sitios clickeables del globo están también como botones debajo: el marcador es un atajo visual.
  el.setAttribute('aria-hidden', 'true')
  const cluster = (m.colors ?? []).length
    ? `<span class="gm-cluster">${(m.colors ?? [])
        .map((c, i) => `<i data-dim="${m.dims?.[i] ?? ''}" style="--c:${c}"></i>`)
        .join('')}</span>`
    : ''
  let html = ''
  switch (m.kind) {
    case 'famous':
      html = `<span class="gm-dot"></span><span class="gm-label">${esc(m.label ?? '')}</span>`
      break
    case 'selected':
      html = `<span class="gm-pin"></span>`
      break
    case 'origin':
      html = `<span class="gm-origin-dot" title="${esc(m.label ?? '')}"></span>`
      break
    case 'overall':
      html = `<span class="gm-halo"></span><span class="gm-core"></span><span class="gm-label gm-label-strong">${esc(
        m.label ?? '',
      )}${m.sub ? `<b>${esc(m.sub)}</b>` : ''}</span>${cluster}`
      break
    case 'dims':
      html = cluster
      break
  }
  el.innerHTML = `<div class="gm-in">${html}</div>`
}

/** ¿Hay WebGL? Sin él, cada globo muestra una imagen fija del cuerpo en lugar de quedar vacío. */
const HAS_WEBGL = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
})()

function StillGlobe({ body, label }: { body: Body; label: string }) {
  const t = useT()
  return (
    <div className="absolute inset-0 grid place-items-center" role="img" aria-label={t('still', { label })}>
      <div
        className="aspect-square h-[62%] max-h-[340px] rounded-full border border-(--line)"
        style={{ backgroundImage: `url(${TEXTURE[body]})`, backgroundSize: '200% 100%', backgroundPosition: 'center' }}
      />
    </div>
  )
}

export default function GlobeView({ body, markers, rings = [], arcs = [], focus, highlightDim, dots = [], onPick, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const elCache = useRef(new Map<string, HTMLElement>())
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [ready, setReady] = useState(false)
  const reduced = useReducedMotion()
  // Material con casquetes polares (uno por cuerpo; GlobeView se remonta al cambiar de cuerpo)
  const material = useMemo(() => createPolarGlobeMaterial(body), [body])
  useEffect(() => () => material.dispose(), [material])

  // Tamaño responsivo
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Controles: amortiguación suave, sin zoom extremo
  useEffect(() => {
    const g = globeRef.current
    if (!g || !ready) return
    const c = g.controls()
    c.enableDamping = true
    c.dampingFactor = 0.08
    c.rotateSpeed = 0.6
    c.zoomSpeed = 0.7
    c.minDistance = 130
    c.maxDistance = 520
    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // Filtrado anisotrópico en la textura equirectangular (la carga three-globe)
    if (material.map) {
      material.map.anisotropy = g.renderer().capabilities.getMaxAnisotropy()
      material.map.needsUpdate = true
    }
  }, [ready, material])

  // Movimiento que descansa: anillos y arco animan ~6 s tras cada cambio y luego quedan quietos
  // (nada se mueve indefinidamente; un loop lento sin fin cansa y distrae).
  const focusKey = focus?.key
  const [lively, setLively] = useState(true)
  useEffect(() => {
    setLively(true)
    const t = setTimeout(() => setLively(false), 6000)
    return () => clearTimeout(t)
  }, [focusKey])
  const animate = lively && !reduced

  // Vuelo de cámara al foco
  useEffect(() => {
    const g = globeRef.current
    if (!g || !ready || !focus) return
    g.pointOfView({ lat: focus.lat, lng: focus.lon, altitude: focus.altitude ?? 1.9 }, reduced ? 0 : 1400)
  }, [focusKey, ready, reduced])

  // Elementos HTML: se reutilizan por id para que los hover/estados sean baratos
  const htmlData = useMemo(() => {
    const cache = elCache.current
    const live = new Set<string>()
    const data = markers.map((m) => {
      live.add(m.id)
      let el = cache.get(m.id)
      if (!el) {
        el = document.createElement('div')
        cache.set(m.id, el)
      }
      render(el, m)
      return { ...m, el }
    })
    for (const k of [...cache.keys()]) if (!live.has(k)) cache.delete(k)
    return data
  }, [markers])

  // Resaltado de marcadores al pasar por una card de dimensión
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.classList.toggle('has-hl', !!highlightDim)
    for (const { el, dims } of htmlData) {
      el.classList.toggle('is-hl', !!highlightDim && !!dims?.includes(highlightDim))
      el.querySelectorAll<HTMLElement>('[data-dim]').forEach((i) => {
        i.classList.toggle('is-hl', i.dataset.dim === highlightDim)
      })
    }
  }, [highlightDim, htmlData])

  const atm = ATMOS[body]
  // En claro, la atmósfera se achica: un halo azul ancho sobre blanco se ve sucio
  const light = useStore((s) => s.theme) === 'light'

  if (!HAS_WEBGL) return <StillGlobe body={body} label={ariaLabel} />

  return (
    <>
    {!ready && (
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
        <div className="h-[62%] max-h-[340px] aspect-square rounded-full border border-(--line-strong) bg-[radial-gradient(circle_at_35%_30%,var(--line-strong),transparent_65%)] motion-safe:animate-pulse" />
      </div>
    )}
    <div
      ref={wrapRef}
      className={`globe-wrap absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'} ${
        onPick ? 'cursor-crosshair' : ''
      }`}
      role="img"
      aria-label={ariaLabel}
    >
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          rendererConfig={{ antialias: true, alpha: true }}
          globeMaterial={material}
          showGraticules
          globeCurvatureResolution={2}
          globeImageUrl={TEXTURE[body]}
          // Relieve solo en la Tierra (topografía real). Usar la textura de color como relieve
          // en la Luna/Marte inventaba sombras y marcaba los rayos del polo.
          bumpImageUrl={body === 'earth' ? '/textures/earth-bump.webp' : null}
          showAtmosphere
          atmosphereColor={atm.color}
          atmosphereAltitude={light ? atm.alt * 0.45 : atm.alt}
          onGlobeReady={() => setReady(true)}
          onGlobeClick={onPick ? ({ lat, lng }) => onPick(lat, lng) : undefined}
          htmlElementsData={htmlData}
          htmlLat={(d: object) => (d as Marker).lat}
          htmlLng={(d: object) => (d as Marker).lon}
          htmlAltitude={(d: object) => ((d as Marker).kind === 'overall' ? 0.02 : 0.01)}
          htmlElement={(d: object) => (d as { el: HTMLElement }).el}
          htmlTransitionDuration={reduced ? 0 : 700}
          htmlElementVisibilityModifier={(el, visible) => el.classList.toggle('is-hidden', !visible)}
          pointsData={dots}
          pointLat={(d: object) => (d as [number, number])[0]}
          pointLng={(d: object) => (d as [number, number])[1]}
          pointColor={() => (light ? 'rgba(10, 60, 140, 0.75)' : 'rgba(156, 199, 255, 0.7)')}
          pointAltitude={0.004}
          pointRadius={0.32}
          pointResolution={4}
          pointsMerge
          pointsTransitionDuration={0}
          ringsData={animate ? rings : []}
          ringLat="lat"
          ringLng="lng"
          ringColor={(r: object) => (t: number) => {
            const c = (r as { color: string }).color
            return `${c}${Math.round((1 - t) * 255).toString(16).padStart(2, '0')}`
          }}
          ringMaxRadius={5}
          ringPropagationSpeed={reduced ? 0 : 2.4}
          ringRepeatPeriod={1100}
          ringAltitude={0.004}
          arcsData={arcs}
          arcColor={() => ['rgba(255,255,255,0.15)', '#3987e5', '#9cc7ff']}
          arcAltitudeAutoScale={0.28}
          arcStroke={0.7}
          arcDashLength={animate ? 0.55 : 1}
          arcDashGap={animate ? 0.25 : 0}
          arcDashInitialGap={animate ? 1 : 0}
          arcDashAnimateTime={animate ? 2600 : 0}
          arcsTransitionDuration={reduced ? 0 : 900}
        />
      )}
    </div>
    </>
  )
}
