import { useEffect, useRef } from 'react'

/** Fondo: gradiente nebuloso + estrellas tenues (dibujadas una vez, se redibujan al cambiar tamaño). */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      c.width = w * dpr
      c.height = h * dpr
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--star').trim() || '255 255 255'
      const [r, g, b] = rgb.split(/\s+/)
      let seed = 7
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      const n = Math.round((w * h) / 2600)
      for (let i = 0; i < n; i++) {
        const x = rnd() * w
        const y = rnd() * h
        const big = rnd() > 0.97
        const rad = big ? 1.1 + rnd() * 0.6 : 0.3 + rnd() * 0.6
        ctx.beginPath()
        ctx.arc(x, y, rad, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${big ? 0.75 : 0.12 + rnd() * 0.35})`
        ctx.fill()
      }
    }
    draw()
    window.addEventListener('resize', draw)
    const mo = new MutationObserver(draw)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('resize', draw)
      mo.disconnect()
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 700px at 12% -10%, var(--nebula-a), transparent 60%), radial-gradient(900px 600px at 95% 10%, var(--nebula-b), transparent 60%), radial-gradient(1000px 800px at 50% 120%, var(--nebula-a), transparent 60%), linear-gradient(180deg, var(--bg), var(--bg-2))',
        }}
      />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
