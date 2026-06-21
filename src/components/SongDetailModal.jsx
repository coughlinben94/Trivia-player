import { useState, useEffect } from 'react'

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function SongDetailModal({ track, player, onUpdateTimes, onClose }) {
  const { position, duration, seek, playTrack, fadeAndPause, currentTrack, isPaused } = player

  const isActive = currentTrack?.uri === track.uri
  const isPlaying = isActive && !isPaused

  const displayDuration = isActive && duration > 0 ? duration : track.duration_ms
  const displayPosition = isActive ? position : 0

  const [startMs, setStartMs] = useState(track.startMs ?? 0)
  const [stopMs, setStopMs] = useState(track.stopMs ?? track.duration_ms)

  const img = track.album?.images?.[0]
  const artists = track.artists?.map(a => a.name).join(', ')

  const progress = displayDuration > 0 ? (displayPosition / displayDuration) * 100 : 0
  const inPct   = displayDuration > 0 ? (startMs / displayDuration) * 100 : 0
  const outPct  = displayDuration > 0 ? (stopMs  / displayDuration) * 100 : 0

  const handlePlay = () => playTrack(track.uri, startMs, 0) // 0 = no auto-stop while previewing
  const handleStop = () => fadeAndPause()

  const handleSetIn  = () => setStartMs(Math.min(displayPosition, stopMs - 2000))
  const handleSetOut = () => setStopMs(Math.max(displayPosition, startMs + 2000))

  const handleSave = () => {
    onUpdateTimes(track.id, startMs, stopMs)
    if (isPlaying) fadeAndPause()
    onClose()
  }

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { if (isPlaying) fadeAndPause(); onClose() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isPlaying])

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={() => { if (isPlaying) fadeAndPause(); onClose() }}
    >
      <div
        className="bg-[#141414] border border-white/[0.07] rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/[0.05]">
            {img && <img src={img.url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-white leading-tight truncate">{track.name}</p>
            <p className="text-xs text-white/40 mt-1 truncate">{artists}</p>
            <p className="text-[10px] text-white/20 mt-1">{fmt(track.duration_ms)}</p>
          </div>
          <button
            onClick={() => { if (isPlaying) fadeAndPause(); onClose() }}
            className="text-white/30 hover:text-white/60 transition-colors duration-150 cursor-pointer mt-0.5 flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Scrubber + in/out overlay */}
        <div className="mb-2">
          <div className="relative mb-1.5">
            {/* In/out range bar behind the scrubber */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full overflow-hidden pointer-events-none"
              style={{
                background: `linear-gradient(to right,
                  rgba(255,255,255,0.08) 0%,
                  rgba(255,255,255,0.08) ${inPct}%,
                  #1DB954 ${inPct}%,
                  #1DB954 ${outPct}%,
                  rgba(255,255,255,0.08) ${outPct}%,
                  rgba(255,255,255,0.08) 100%)`,
              }}
            />
            <input
              type="range"
              className="player-scrubber w-full relative"
              min={0}
              max={displayDuration || 1}
              value={displayPosition}
              style={{ '--progress': `${progress}%`, background: 'transparent' }}
              onChange={e => isActive && seek(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/25 tabular-nums">{fmt(displayPosition)}</span>
            <span className="text-[10px] text-white/25 tabular-nums">{fmt(displayDuration)}</span>
          </div>
        </div>

        {/* In/out labels */}
        <div className="flex justify-between mb-5 px-0.5">
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">In</span>
            <span className="text-xs font-mono text-[#1DB954] ml-2">{fmt(startMs)}</span>
          </div>
          <div>
            <span className="text-xs font-mono text-[#1DB954] mr-2">{fmt(stopMs)}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/25">Out</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={handleSetIn}
            disabled={!isActive}
            className="py-2.5 text-[11px] font-medium bg-white/[0.05] hover:bg-white/[0.09] disabled:opacity-25 rounded-xl text-white/70 transition-all duration-150 cursor-pointer active:scale-[0.97]"
          >
            Set In
          </button>
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={`py-2.5 text-[11px] font-semibold rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.97] ${
              isPlaying
                ? 'bg-white/10 text-white'
                : 'bg-white/[0.06] text-white/80 hover:bg-white/10'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={handleSetOut}
            disabled={!isActive}
            className="py-2.5 text-[11px] font-medium bg-white/[0.05] hover:bg-white/[0.09] disabled:opacity-25 rounded-xl text-white/70 transition-all duration-150 cursor-pointer active:scale-[0.97]"
          >
            Set Out
          </button>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-[#1DB954] text-black text-xs font-bold rounded-xl hover:bg-[#1ed760] active:scale-[0.97] transition-all duration-150 cursor-pointer"
        >
          Save & Close
        </button>
      </div>
    </div>
  )
}
