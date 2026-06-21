import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export default function LiveScreen({ currentTrack, isPaused, onClose }) {
  const shouldReduceMotion = useReducedMotion()
  const [shown, setShown]       = useState(currentTrack)
  const [prev, setPrev]         = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinKey, setSpinKey]   = useState(0)
  const [reelCards, setReelCards] = useState([])
  const spinTimerRef = useRef(null)

  useEffect(() => {
    if (!currentTrack || currentTrack.uri === shown?.uri) return
    setPrev(shown)
    setShown(currentTrack)
    if (shown) {
      const count = 15 + Math.floor(Math.random() * 6)
      setReelCards(Array.from({ length: count }, (_, i) => ({
        id: i,
        width: 80 + Math.floor(Math.random() * 41),
        delay: i * (0.025 + Math.random() * 0.015),
        duration: 0.18 + Math.random() * 0.10,
      })))
      setIsSpinning(true)
      setSpinKey(k => k + 1)
      clearTimeout(spinTimerRef.current)
      spinTimerRef.current = setTimeout(() => setIsSpinning(false), 900)
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

      {/* Full-viewport reel: white cards fly left → right above everything */}
      <AnimatePresence>
        {isSpinning
          ? reelCards.map((card) => (
              <motion.div
                key={`${spinKey}-${card.id}`}
                className="absolute inset-y-0 bg-white"
                style={{ width: card.width, left: 0, zIndex: 30 }}
                initial={{ x: -200 }}
                animate={{ x: window.innerWidth + 200 }}
                exit={{}}
                transition={{
                  delay:    card.delay,
                  duration: card.duration,
                  ease:     [0.3, 0, 0.8, 1],
                }}
              />
            ))
          : null}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-10 text-center max-w-lg w-full">
        {shown ? (
          <>
            {/*
             * Outer div: pulse animation only, no overflow-hidden so the spring
             * overshoot (scale > 1) punches the card visibly forward.
             * Inner motion.div: spring pop + overflow-hidden clips the image.
             * Separated to prevent transform conflict between CSS pulse and FM spring.
             */}
            <div
              className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl ${!isPaused && !isSpinning && !prev ? 'live-playing' : ''}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={shown.uri}
                  className="absolute inset-0 rounded-2xl overflow-hidden"
                  style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
                  initial={{ scale: 0.80, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    transition: shouldReduceMotion
                      ? { duration: 0.2 }
                      : {
                          scale:   { type: 'spring', stiffness: 300, damping: 18, delay: 0.55 },
                          opacity: { duration: 0.06, delay: 0.55 },
                        },
                  }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.08 } }}
                >
                  <img src={artUrl} alt="" className="w-full h-full object-cover" />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Track info */}
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

      {/* Paused pill — hidden during transitions */}
      {isPaused && shown && !isSpinning && !prev && (
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
