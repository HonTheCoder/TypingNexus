// ─────────────────────────────────────────────────────────────────────────────
// components/leaderboard/Leaderboard.jsx
// – Top 10 only (enforced both server-side via limit(10) and client-side slice)
// – Scores NOT in top 10 are still saved but never displayed here
// – Mistakes column always visible, pink when > 0
// – Full mobile-responsive layout
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react'
import { RefreshCw, Medal } from 'lucide-react'
import Backdrop3D from '../three/Backdrop3D'
import { fetchTopScores } from '../../firebase/leaderboard'
import { useGameStore, CATEGORIES, DIFFICULTIES, TIME_LIMITS, timeLabel } from '../../store/useGameStore'
import { useSfx } from '../../hooks/useAudio'
import { useHaptics } from '../../hooks/useHaptics'

const TOP_N     = 10
const CACHE_TTL = 30_000

// Rank medal colours
const RANK_STYLE = [
  'text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]',  // 1st
  'text-slate-300  drop-shadow-[0_0_4px_rgba(203,213,225,0.5)]', // 2nd
  'text-amber-600  drop-shadow-[0_0_4px_rgba(180,83,9,0.5)]',    // 3rd
]
const rankStyle = (i) => RANK_STYLE[i] ?? 'text-slate-400'

export default function Leaderboard() {
  const setScene = useGameStore(s => s.setScene)
  const sfx      = useSfx()
  const haptics  = useHaptics()

  const [category,   setCategory]   = useState('words')
  const [difficulty, setDifficulty] = useState('easy')
  const [timeLimit,  setTimeLimit]  = useState(60)
  const [rows,       setRows]       = useState(null)   // null = loading
  const [failed,     setFailed]     = useState(false)
  const [errorMsg,   setErrorMsg]   = useState('')
  const cache = useRef(new Map())

  const load = useCallback(async (forceRefresh = false) => {
    const key    = `${category}|${difficulty}|${timeLimit}`
    const cached = cache.current.get(key)
    if (!forceRefresh && cached && Date.now() - cached.at < CACHE_TTL) {
      setRows(cached.data); setFailed(false); setErrorMsg(''); return
    }
    setRows(null); setFailed(false); setErrorMsg('')
    try {
      // fetchTopScores already passes limit(10) to Firestore
      const data = await fetchTopScores(category, difficulty, timeLimit, TOP_N)
      // Client-side guard: never show more than TOP_N regardless of mock/cache
      const top  = data.slice(0, TOP_N)
      cache.current.set(key, { data: top, at: Date.now() })
      setRows(top)
    } catch (err) {
      console.error('Leaderboard fetch failed:', err)
      setErrorMsg(err.userMessage ?? err.message ?? 'Unknown error')
      setFailed(true)
      setRows([])
    }
  }, [category, difficulty, timeLimit])

  useEffect(() => { load() }, [load])

  const Tab = ({ active, onClick, children }) => (
    <button
      onClick={() => { sfx.click(); haptics.tap(); onClick() }}
      className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-display tracking-widest uppercase transition-all duration-300 active:scale-95
        ${active
          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.7)]'
          : 'text-cyan-400/60 border border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
        }`}
    >
      {children}
    </button>
  )

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <Backdrop3D />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-yellow-500/8 blur-[140px]" />
      </div>

      {/* Scrollable content */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center px-3 py-4 sm:py-8">
          <div className="w-full max-w-lg bg-slate-900/65 backdrop-blur-md border border-yellow-500/20 rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.12)] animate-fade-up overflow-hidden">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-slate-700/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Medal size={18} className="text-yellow-300" />
                  <h2 className="font-display font-bold text-lg sm:text-2xl uppercase tracking-[0.2em] text-yellow-300 neon-text">
                    World Records
                  </h2>
                </div>
                <button
                  onClick={() => { sfx.click(); haptics.tap(); load(true) }}
                  title="Refresh"
                  className="p-2 rounded-lg border border-yellow-500/30 text-yellow-300/60 hover:text-yellow-300 hover:border-yellow-400 transition-all duration-300 active:scale-95"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
              <p className="text-slate-500 text-[9px] tracking-[0.3em] uppercase mt-1">
                Top {TOP_N} pilots per configuration
              </p>
            </div>

            {/* ── Filters ───────────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 py-4 space-y-2.5 border-b border-slate-700/40">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <Tab key={c} active={c === category} onClick={() => setCategory(c)}>{c}</Tab>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTIES.map(d => (
                  <Tab key={d} active={d === difficulty} onClick={() => setDifficulty(d)}>{d}</Tab>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TIME_LIMITS.map(t => (
                  <Tab key={t} active={t === timeLimit} onClick={() => setTimeLimit(t)}>{timeLabel(t)}</Tab>
                ))}
              </div>
            </div>

            {/* ── Table / states ────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 py-4">
              {rows === null ? (
                <div className="py-12 text-center">
                  <p className="text-cyan-400/50 animate-pulse tracking-[0.35em] text-xs font-display">
                    SYNCING WITH THE GRID...
                  </p>
                </div>
              ) : failed ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-red-400 tracking-[0.3em] font-display text-sm">UPLINK FAILED</p>
                  <p className="text-red-400/60 text-xs leading-relaxed max-w-xs mx-auto">{errorMsg}</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-500 tracking-[0.3em] text-xs">NO RECORDS YET</p>
                  <p className="text-slate-600 tracking-[0.2em] text-[10px] mt-2">BE THE FIRST PILOT ON THE GRID</p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-[20px_1fr_52px_52px_44px] gap-x-2 pb-2 mb-1 border-b border-slate-700/40">
                    <span className="text-[9px] tracking-[0.2em] text-slate-600 uppercase">#</span>
                    <span className="text-[9px] tracking-[0.2em] text-slate-600 uppercase">Pilot</span>
                    <span className="text-[9px] tracking-[0.2em] text-slate-600 uppercase text-right">WPM</span>
                    <span className="text-[9px] tracking-[0.2em] text-slate-600 uppercase text-right">Acc</span>
                    <span className="text-[9px] tracking-[0.2em] text-pink-400/50 uppercase text-right">Err</span>
                  </div>

                  {/* Rows */}
                  <div className="space-y-0.5">
                    {rows.map((r, i) => (
                      <div
                        key={r.id}
                        className={`grid grid-cols-[20px_1fr_52px_52px_44px] gap-x-2 items-center py-2.5
                          border-b border-slate-800/60 last:border-0
                          ${i < 3 ? 'bg-slate-800/20 rounded-lg px-1 -mx-1' : ''}`}
                      >
                        {/* Rank */}
                        <span className={`font-display text-sm font-bold ${rankStyle(i)}`}>
                          {i + 1}
                        </span>

                        {/* Name */}
                        <span className={`font-display text-sm tracking-wider truncate ${rankStyle(i)}`}>
                          {r.name}
                        </span>

                        {/* WPM */}
                        <span className={`font-display text-sm font-bold text-right ${rankStyle(i)}`}>
                          {r.wpm}
                        </span>

                        {/* Accuracy */}
                        <span className="text-xs text-right text-slate-400 tabular-nums">
                          {r.accuracy}%
                        </span>

                        {/* Mistakes — pink when > 0, dim dash when absent */}
                        <span className={`font-display text-xs text-right tabular-nums
                          ${(r.mistakes ?? 0) > 0
                            ? 'text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.5)]'
                            : 'text-slate-600'
                          }`}>
                          {r.mistakes != null ? r.mistakes : '—'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer note */}
                  <p className="text-slate-600 text-[9px] tracking-[0.2em] uppercase mt-4 text-center">
                    Only the top {TOP_N} scores per mode are shown
                  </p>
                </>
              )}
            </div>

            {/* ── Back button ───────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 pb-5 pt-1">
              <button
                onClick={() => { sfx.click(); haptics.tap(); setScene('menu') }}
                className="w-full py-3 rounded-lg border border-slate-700/50 text-slate-500 hover:text-fuchsia-400 hover:border-fuchsia-500/40 text-[10px] tracking-[0.35em] uppercase transition-all duration-300 active:scale-95"
              >
                ← Back to Menu
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}