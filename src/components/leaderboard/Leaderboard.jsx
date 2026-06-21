// ─────────────────────────────────────────────────────────────────────────────
// components/leaderboard/Leaderboard.jsx
// Two tabs: TYPING (filtered by category/difficulty/time) and UFO (global top 10)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react'
import { RefreshCw, Medal, Crosshair, Zap } from 'lucide-react'
import Backdrop3D from '../three/Backdrop3D'
import { fetchTopScores, fetchUfoScores } from '../../firebase/leaderboard'
import { useGameStore, CATEGORIES, DIFFICULTIES, TIME_LIMITS, timeLabel } from '../../store/useGameStore'
import { useSfx } from '../../hooks/useAudio'
import { useHaptics } from '../../hooks/useHaptics'

const TOP_N     = 10
const CACHE_TTL = 30_000
const WAVE_LABEL = { early: 'Wave 1', mid: 'Wave 2', late: 'Wave 3' }

// Rank colours: gold / silver / bronze / rest
const rankCls = (i) => [
  'text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]',
  'text-slate-300',
  'text-amber-600',
][i] ?? 'text-slate-500'

export default function Leaderboard() {
  const setScene = useGameStore(s => s.setScene)
  const sfx      = useSfx()
  const haptics  = useHaptics()

  // Which leaderboard tab is active
  const [boardMode,  setBoardMode]  = useState('typing')  // 'typing' | 'ufo'

  // Typing filters
  const [category,   setCategory]   = useState('words')
  const [difficulty, setDifficulty] = useState('easy')
  const [timeLimit,  setTimeLimit]  = useState(60)

  // Data
  const [rows,   setRows]   = useState(null)
  const [failed, setFailed] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const cache = useRef(new Map())

  const load = useCallback(async (force = false) => {
    const key = boardMode === 'ufo'
      ? 'ufo'
      : `${category}|${difficulty}|${timeLimit}`

    const cached = cache.current.get(key)
    if (!force && cached && Date.now() - cached.at < CACHE_TTL) {
      setRows(cached.data); setFailed(false); setErrMsg(''); return
    }
    setRows(null); setFailed(false); setErrMsg('')
    try {
      const data = boardMode === 'ufo'
        ? await fetchUfoScores(TOP_N)
        : await fetchTopScores(category, difficulty, timeLimit, TOP_N)
      const top = data.slice(0, TOP_N)
      cache.current.set(key, { data: top, at: Date.now() })
      setRows(top)
    } catch (err) {
      setErrMsg(err.userMessage ?? err.message ?? 'Unknown error')
      setFailed(true); setRows([])
    }
  }, [boardMode, category, difficulty, timeLimit])

  useEffect(() => { load() }, [load])

  // ── Tab button ──────────────────────────────────────────────────────────────
  const ModeTab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => { sfx.click(); haptics.tap(); setBoardMode(id) }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display text-xs tracking-widest uppercase transition-all duration-300 active:scale-95
        ${boardMode === id
          ? id === 'ufo'
            ? 'bg-fuchsia-500 text-slate-950 shadow-[0_0_14px_rgba(217,70,239,0.7)]'
            : 'bg-cyan-500 text-slate-950 shadow-[0_0_14px_rgba(6,182,212,0.7)]'
          : 'border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'
        }`}
    >
      <Icon size={12} />
      {label}
    </button>
  )

  // ── Filter pill ─────────────────────────────────────────────────────────────
  const Pill = ({ active, onClick, children }) => (
    <button
      onClick={() => { sfx.click(); haptics.tap(); onClick() }}
      className={`px-3 py-1 rounded-md font-display text-[10px] tracking-widest uppercase transition-all duration-300 active:scale-95
        ${active
          ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
          : 'border border-slate-700/50 text-slate-500 hover:border-slate-500 hover:text-slate-400'
        }`}
    >
      {children}
    </button>
  )

  // ── Typing leaderboard table ────────────────────────────────────────────────
  const TypingTable = () => (
    <>
      {/* Column headers */}
      <div className="grid items-center gap-x-2 pb-2 border-b border-slate-700/40 text-[9px] tracking-[0.2em] text-slate-600 uppercase"
        style={{ gridTemplateColumns: '18px 1fr 46px 46px 38px' }}>
        <span>#</span>
        <span>Pilot</span>
        <span className="text-right">WPM</span>
        <span className="text-right">Acc</span>
        <span className="text-right text-pink-400/50">Err</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/50">
        {rows.map((r, i) => (
          <div key={r.id}
            className={`grid items-center gap-x-2 py-2.5 ${i < 3 ? 'bg-slate-800/20 rounded-lg px-1 -mx-1' : ''}`}
            style={{ gridTemplateColumns: '18px 1fr 46px 46px 38px' }}>
            <span className={`font-display text-sm font-bold ${rankCls(i)}`}>{i + 1}</span>
            <span className={`font-display text-sm tracking-wide truncate ${rankCls(i)}`}>{r.name}</span>
            <span className={`font-display text-sm font-bold text-right ${rankCls(i)}`}>{r.wpm}</span>
            <span className="text-xs text-right text-slate-400 tabular-nums">{r.accuracy}%</span>
            <span className={`font-display text-xs text-right tabular-nums
              ${(r.mistakes ?? 0) > 0 ? 'text-pink-400' : 'text-slate-700'}`}>
              {r.mistakes != null ? r.mistakes : '—'}
            </span>
          </div>
        ))}
      </div>
    </>
  )

  // ── UFO leaderboard table ───────────────────────────────────────────────────
  const UfoTable = () => (
    <>
      <div className="grid items-center gap-x-2 pb-2 border-b border-slate-700/40 text-[9px] tracking-[0.2em] text-slate-600 uppercase"
        style={{ gridTemplateColumns: '18px 1fr 64px 56px 48px' }}>
        <span>#</span>
        <span>Pilot</span>
        <span className="text-right">Score</span>
        <span className="text-right">Wave</span>
        <span className="text-right">Time</span>
      </div>

      <div className="divide-y divide-slate-800/50">
        {rows.map((r, i) => (
          <div key={r.id}
            className={`grid items-center gap-x-2 py-2.5 ${i < 3 ? 'bg-slate-800/20 rounded-lg px-1 -mx-1' : ''}`}
            style={{ gridTemplateColumns: '18px 1fr 64px 56px 48px' }}>
            <span className={`font-display text-sm font-bold ${rankCls(i)}`}>{i + 1}</span>
            <span className={`font-display text-sm tracking-wide truncate ${rankCls(i)}`}>{r.name}</span>
            <span className={`font-display text-sm font-bold text-right ${rankCls(i)}`}>{r.score}</span>
            <span className="text-[10px] text-right text-fuchsia-400 tabular-nums">
              {WAVE_LABEL[r.wave] ?? r.wave}
            </span>
            <span className="text-[10px] text-right text-slate-400 tabular-nums">
              {r.elapsed}s
            </span>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <Backdrop3D />

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-yellow-500/6 blur-[160px]" />
      </div>

      <div className="absolute inset-0 z-10 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center px-3 py-4 sm:py-8">
          <div className="w-full max-w-lg bg-slate-900/65 backdrop-blur-md border border-yellow-500/20 rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.10)] animate-fade-up overflow-hidden">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-slate-700/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Medal size={16} className="text-yellow-300 shrink-0" />
                  <h2 className="font-display font-bold text-lg sm:text-xl uppercase tracking-[0.2em] text-yellow-300 neon-text">
                    World Records
                  </h2>
                </div>
                <button onClick={() => { sfx.click(); haptics.tap(); load(true) }}
                  className="p-1.5 rounded-lg border border-yellow-500/25 text-yellow-300/50 hover:text-yellow-300 hover:border-yellow-400 transition-all duration-300 active:scale-95">
                  <RefreshCw size={12} />
                </button>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-2 mt-4">
                <ModeTab id="typing" icon={Crosshair} label="Typing" />
                <ModeTab id="ufo"    icon={Zap}       label="UFO Mode" />
              </div>
            </div>

            {/* ── Typing filters (hidden in UFO tab) ──────────────────────── */}
            {boardMode === 'typing' && (
              <div className="px-4 sm:px-6 py-4 space-y-2 border-b border-slate-700/40">
                {/* Category */}
                <div>
                  <p className="text-[8px] tracking-[0.3em] text-slate-600 uppercase mb-1.5">Text Type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <Pill key={c} active={c === category} onClick={() => setCategory(c)}>{c}</Pill>
                    ))}
                  </div>
                </div>
                {/* Difficulty */}
                <div>
                  <p className="text-[8px] tracking-[0.3em] text-slate-600 uppercase mb-1.5">Difficulty</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIFFICULTIES.map(d => (
                      <Pill key={d} active={d === difficulty} onClick={() => setDifficulty(d)}>{d}</Pill>
                    ))}
                  </div>
                </div>
                {/* Time */}
                <div>
                  <p className="text-[8px] tracking-[0.3em] text-slate-600 uppercase mb-1.5">Time Limit</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_LIMITS.map(t => (
                      <Pill key={t} active={t === timeLimit} onClick={() => setTimeLimit(t)}>{timeLabel(t)}</Pill>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── UFO tab sub-header ───────────────────────────────────────── */}
            {boardMode === 'ufo' && (
              <div className="px-4 sm:px-6 py-3 border-b border-slate-700/40">
                <p className="text-[9px] tracking-[0.3em] text-fuchsia-400/60 uppercase">
                  Global top {TOP_N} — ranked by score
                </p>
              </div>
            )}

            {/* ── Table area ──────────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 py-4">
              {rows === null ? (
                <div className="py-10 text-center">
                  <p className="text-cyan-400/40 animate-pulse tracking-[0.35em] text-xs font-display">
                    SYNCING WITH THE GRID...
                  </p>
                </div>
              ) : failed ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-red-400 tracking-[0.3em] font-display text-sm">UPLINK FAILED</p>
                  <p className="text-red-400/50 text-xs leading-relaxed max-w-xs mx-auto">{errMsg}</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-slate-500 tracking-[0.3em] text-xs">NO RECORDS YET</p>
                  <p className="text-slate-600 tracking-[0.2em] text-[10px] mt-1">BE THE FIRST PILOT ON THE GRID</p>
                </div>
              ) : (
                <>
                  {boardMode === 'typing' ? <TypingTable /> : <UfoTable />}
                  <p className="text-slate-700 text-[9px] tracking-[0.2em] uppercase mt-4 text-center">
                    Showing top {rows.length} of {TOP_N} max
                  </p>
                </>
              )}
            </div>

            {/* ── Back ────────────────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 pb-5 pt-1">
              <button
                onClick={() => { sfx.click(); haptics.tap(); setScene('menu') }}
                className="w-full py-2.5 rounded-lg border border-slate-700/50 text-slate-500 hover:text-fuchsia-400 hover:border-fuchsia-500/40 text-[10px] tracking-[0.35em] uppercase transition-all duration-300 active:scale-95"
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