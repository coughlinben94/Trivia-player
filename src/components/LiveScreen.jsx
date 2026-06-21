import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const REEL_CARDS = 10

export default function LiveScreen({ currentTrack, isPaused, onClose }) {
  const shouldReduceMotion = useReducedMotion()
  const [shown, setShown]       = useState(currentTrack)
  const [prev, setPrev]         = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinKey, setSpinKey]   = useState(0)
  const spinTimerRef = useRef(null)

  useEffect(() => {
    if (!currentTrack || currentTrack.uri === shown?.uri) return
    setPrev(shown)
    setShown(currentTrack)
    // Trigger reel on every transition (not on first mount)
    if (shown) {
      setIsSpinning(true)
      setSpinKey(k => k + 1)
      clearTimeout(spinTimerRef.current)
      spinTimerRef.current = setTimeout(() => setIsSpinning(false), 500)
    }
  }, [currentTrack?.uri])

  useEffect(() => {
    if (!prev) return
    const t = setTimeout(() => setPrev(null), 500)
    return () => clearTimeout(t)
  }, [prev?.uri])

  useEffect(() => () => clearTimeout(spinTimerRef.current), [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const bgUrl    = shown?.album?.images?.[0]?.url
  const prevBgUrl = prev?.album?.images?.[0]?.url
  const artUrl   = shown?.album?.images?.[0]?.url

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col items-center justify-center">

      {/* Blurred background — old color exits fast */}
      {prevBgUrl && (
        <div
          key={prev.uri + '-bg'}
          className="absolute inset-0 bg-center bg-cover live-bg-out"
          style={{
            backgroundImage: `url(${prevBgUrl})`,
            filter: 'blur(72px) brightness(0.25) saturate(1.8)',
            transform: 'scale(1.25)',
          }}
        />
      )}

      {/* Blurred background — new color washes in slowly */}
      {bgUrl && (
        <div
          key={(shown?.uri ?? 'empty') + '-bg'}
          className="absolute inset-0 bg-center bg-cover live-bg-in"
          style={{
            backgroundImage: `url(${bgUrl})`,
            filter: 'blur(72px) brightness(0.25) saturate(1.8)',
            transform: 'scale(1.25)',
          }}
        />
      )}

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-10 text-center max-w-lg w-full">
        {shown ? (
          <>
            {/*
             * Jukebox reel effect:
             *   1. Old art exits fast (scale+fade, 100ms)
             *   2. 10 blank white cards cascade upward over the container (staggered, 300ms total)
             *   3. New art springs forward from scale 0.88 after 280ms delay — pops out of the reel
             *
             * Reel cards are siblings of the art (same overflow-hidden container) so they're
             * clipped to the rounded frame. Pulse on the outer container; spring on the art card.
             * No shared transform conflict.
             */}
            <div
              className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden ${!isPaused && !isSpinning && !prev ? 'live-playing' : ''}`}
              style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
            >
              {/* Art card: exits fast, enters with spring pop after reel */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={shown.uri}
                  className="absolute inset-0"
                  // Emil: never scale below 0.90 on entry; spring for natural pop
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    transition: shouldReduceMotion
                      ? { duration: 0.2 }
                      : {
                          scale:   { type: 'spring', stiffness: 380, damping: 28, delay: 0.28 },
                          opacity: { duration: 0.04, delay: 0.28 },
                        },
                  }}
                  exit={{
                    scale: 0.96,
                    opacity: 0,
                    // Emil: ease-out on exit (starts immediately, never ease-in which looks sluggish)
                    transition: { duration: 0.08, ease: [0.23, 1, 0.32, 1] },
                  }}
                >
                  <img src={artUrl} alt="" className="w-full h-full object-cover" />
                </motion.div>
              </AnimatePresence>

              {/* Reel: blank white cards scroll upward, clipped by container overflow-hidden.
                  Skipped entirely for prefers-reduced-motion. */}
              <AnimatePresence>
                {isSpinning && !shouldReduceMotion && Array.from({ length: REEL_CARDS }, (_, i) => (
                  <motion.div
                    key={`${spinKey}-${i}`}
                    className="absolute inset-x-0 bg-white"
                    style={{ height: '100%', top: 0, zIndex: 20 }}
                    initial={{ y: '105%' }}
                    animate={{ y: '-105%' }}
                    exit={{}}
                    transition={{
                      delay:    i * 0.026,
                      duration: 0.14,
                      // Emil: explicit cubic-bezier over built-in 'linear' string
                      ease:     [0, 0, 1, 1],
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Track info — slides up after reel clears */}
            <div key={shown.uri + '-text'} className="live-text-in">
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight mb-2">
                {shown.name}
              </h1>
              <p className="text-lg text-white font-medium">
                {shown.artists?.map(a => a.name).join(', ')}
              </p>
            </div>
          </>
        ) : (
          <p className="text-white text-base">Waiting for music…</p>
        )}
      </div>

      {/* Paused pill */}
      {isPaused && shown && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs text-white tracking-widest uppercase">
          Paused
        </div>
      )}

      {/* Exit */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:text-white transition-colors duration-150 cursor-pointer text-lg leading-none"
        aria-label="Close live screen"
      >
        ✕
      </button>
    </div>
  )
}
