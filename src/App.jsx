import { useEffect, useState } from 'react'
import { login, handleCallback, logout, getToken } from './lib/spotify'

export default function App() {
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      window.history.replaceState({}, '', '/')
      handleCallback(code).then(() => getToken().then(setToken)).finally(() => setLoading(false))
    } else {
      getToken().then(setToken).finally(() => setLoading(false))
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
        <h1 className="text-5xl font-bold tracking-tight">🎵 Trivia Jukebox</h1>
        <button
          onClick={login}
          className="bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-3 rounded-full transition-colors"
        >
          Connect Spotify
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-5xl font-bold tracking-tight">🎵 Trivia Jukebox</h1>
      <p className="text-green-400 text-sm">Connected to Spotify</p>
      <button
        onClick={() => { logout(); setToken(null) }}
        className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
      >
        Disconnect
      </button>
    </div>
  )
}
