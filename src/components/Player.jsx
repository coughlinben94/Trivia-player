function fmt(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Player({ player, isPlaying, onPlay, onStop, onSkip, library }) {
  const { currentTrack, position, duration, seek } = player

  if (library.length === 0) return null

  const art = currentTrack?.album?.images?.[1] ?? currentTrack?.album?.images?.[0]
  const progress = duration > 0 ? (position / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-xl border-t border-white/[0.06] z-20">
      {/* Scrubber */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-white/25 tabular-nums w-7 text-right">{fmt(position)}</span>
          <input
            type="range"
            className="player-scrubber flex-1"
            min={0}
            max={duration || 1}
            value={position}
            style={{ '--progress': `${progress}%` }}
            onChange={e => seek(Number(e.target.value))}
          />
          <span className="text-[10px] text-white/25 tabular-nums w-7">{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-5 pb-5 pt-1">
        {/* Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {art
            ? <img src={art.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            : <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex-shrink-0" />
          }
          <div className="min-w-0">
            {currentTrack ? (
              <>
                <p className="text-sm font-semibold text-white truncate leading-tight">{currentTrack.name}</p>
                <p className="text-xs text-white/40 truncate mt-0.5">
                  {currentTrack.artists?.map(a => a.name).join(', ')}
                </p>
              </>
            ) : (
              <p className="text-sm text-white/25">{library.length} songs ready</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-5 flex-shrink-0">
          {/* Skip */}
          {isPlaying && (
            <button
              onClick={onSkip}
              className="text-white/35 hover:text-white transition-colors duration-150 cursor-pointer active:scale-[0.92]"
              aria-label="Skip"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zm2.5-8.14 5.5 3.89-5.5 3.89V9.86zM16 6h2v12h-2z"/>
              </svg>
            </button>
          )}

          {/* Play / Stop */}
          <button
            onClick={isPlaying ? onStop : onPlay}
            className="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:scale-[1.04] active:scale-[0.95] transition-transform duration-150 cursor-pointer flex-shrink-0"
            aria-label={isPlaying ? 'Fade out' : 'Shuffle play'}
          >
            {isPlaying
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0a0a">
                  <path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                </svg>
            }
          </button>
        </div>

        <div className="flex-1" />
      </div>
    </div>
  )
}
