import { useEffect, useRef, useMemo } from 'react'

const BLEND_FRAMES = 300          // 5 s at 60 fps
const NUM_CIRCLES  = 6
const DIRECTIONS   = ['left', 'right', 'up', 'down']

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  if (!hex || hex.length < 7) return [8, 8, 8]
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function parseColors(hexArr, n) {
  const src = hexArr.length ? hexArr : ['#111111']
  return Array.from({ length: n }, (_, i) => [...hexToRgb(src[i % src.length])])
}

function easeInOut(t) {
  t = Math.max(0, Math.min(1, t))
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function lerp(a, b, t) { return a + (b - a) * t }

// ── Circle layout — seeded per-index so positions are always stable ────────────

function makeCircleParams() {
  function rng(i, slot) {
    const x = Math.sin((i * 7 + slot) * 9301 + 49297) * 233280
    return x - Math.floor(x)
  }
  return Array.from({ length: NUM_CIRCLES }, (_, i) => ({
    baseX:  0.10 + rng(i, 0) * 0.80,        // centre 10–90 % of W
    baseY:  0.10 + rng(i, 1) * 0.80,
    xAmp:   0.20,                             // 20 % drift amplitude
    yAmp:   0.20,
    xFreq:  1 / (25 + rng(i, 2) * 15),      // period 25–40 s
    yFreq:  1 / (25 + rng(i, 3) * 15),
    xPhase: rng(i, 4) * Math.PI * 2,
    yPhase: rng(i, 5) * Math.PI * 2,
    radius: 0.55 + rng(i, 6) * 0.15,        // 55–70 % of max(W, H)
  }))
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AlbumGradient({ colors = [], active = true }) {
  const canvasRef    = useRef(null)
  const activeRef    = useRef(active)
  const mountedRef   = useRef(true)
  const rafRef       = useRef(null)
  const tickRef      = useRef(null)   // set by canvas effect; lets active effect restart the loop
  const isFirst      = useRef(true)
  const circleParams = useMemo(makeCircleParams, [])

  // All mutable animation state in one ref — avoids stale closures in the RAF
  const st = useRef(null)
  if (!st.current) {
    const initial = parseColors(colors, NUM_CIRCLES)
    st.current = {
      startRgb:     initial.map(c => [...c]),
      currentRgb:   initial.map(c => [...c]),
      targetRgb:    initial.map(c => [...c]),
      blendFrame:   BLEND_FRAMES,   // fully blended at startup — no entrance animation
      startOffsetX: 0,
      startOffsetY: 0,
    }
  }

  // New palette → snapshot current state, set target, pick direction, reset counter
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    const s = st.current
    s.startRgb   = s.currentRgb.map(c => [...c])
    s.targetRgb  = parseColors(colors, NUM_CIRCLES)
    s.blendFrame = 0
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
    s.startOffsetX = dir === 'left' ? -1.2 : dir === 'right' ?  1.2 : 0
    s.startOffsetY = dir === 'up'   ? -1.2 : dir === 'down'  ?  1.2 : 0
  }, [colors])

  // Keep active ref in sync; restart loop if it was paused
  useEffect(() => {
    activeRef.current = active
    if (active && !rafRef.current && mountedRef.current) {
      tickRef.current?.()
    }
  }, [active])

  // Canvas + RAF — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      const p = canvas.parentElement
      canvas.width  = (p ? p.clientWidth  : 0) || window.innerWidth
      canvas.height = (p ? p.clientHeight : 0) || window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw(ts) {
      const W = canvas.width
      const H = canvas.height
      if (!W || !H) return

      const maxDim = Math.max(W, H)
      const tSec   = ts / 1000
      const s      = st.current

      // Advance blend counter and compute eased progress
      if (s.blendFrame < BLEND_FRAMES) s.blendFrame++
      const t = easeInOut(s.blendFrame / BLEND_FRAMES)

      // Interpolate each RGB channel from start toward target
      for (let i = 0; i < NUM_CIRCLES; i++) {
        for (let c = 0; c < 3; c++) {
          s.currentRgb[i][c] = lerp(s.startRgb[i][c], s.targetRgb[i][c], t)
        }
      }
      // Snap once fully blended so future frames skip the lerp
      if (s.blendFrame >= BLEND_FRAMES) {
        for (let i = 0; i < NUM_CIRCLES; i++) s.currentRgb[i] = [...s.targetRgb[i]]
      }

      // Directional offset eases from startOffset → 0 over the same window
      const offsetFrac = 1 - t
      const ox = s.startOffsetX * offsetFrac * W
      const oy = s.startOffsetY * offsetFrac * H

      // Near-black base
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#080808'
      ctx.fillRect(0, 0, W, H)

      // Additive blobs — colors combine like light
      ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < NUM_CIRCLES; i++) {
        const p  = circleParams[i]
        const cx = (p.baseX + p.xAmp * Math.sin(tSec * p.xFreq * Math.PI * 2 + p.xPhase)) * W + ox
        const cy = (p.baseY + p.yAmp * Math.sin(tSec * p.yFreq * Math.PI * 2 + p.yPhase)) * H + oy
        const r  = p.radius * maxDim
        const [R, G, B] = s.currentRgb[i]
        const Ri = R | 0, Gi = G | 0, Bi = B | 0

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grad.addColorStop(0, `rgba(${Ri},${Gi},${Bi},0.9)`)
        grad.addColorStop(1, `rgba(${Ri},${Gi},${Bi},0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function tick(ts) {
      draw(ts)
      if (activeRef.current && mountedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    // Exposed so the active effect can restart after a pause
    tickRef.current = () => { rafRef.current = requestAnimationFrame(tick) }

    if (activeRef.current) {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      mountedRef.current = false
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      window.removeEventListener('resize', resize)
    }
  }, [circleParams])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        display: 'block',
      }}
    />
  )
}
