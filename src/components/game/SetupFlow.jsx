// ─────────────────────────────────────────────────────────────────────────────
// components/game/SetupFlow.jsx
// Uses local state for selections, calls configure() on launch which
// writes all three values to the store at once and sets scene:'game'
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Backdrop3D from '../three/Backdrop3D'
import { useGameStore, CATEGORIES, DIFFICULTIES, TIME_LIMITS, timeLabel } from '../../store/useGameStore'
import { useSfx } from '../../hooks/useAudio'
import { useHaptics } from '../../hooks/useHaptics'

function OptionBtn({ active, onClick, children }) {
  const haptics = useHaptics()
  return (
    <button
      onClick={() => { haptics.tap(); onClick() }}
      className={`px-4 py-2 rounded-lg text-xs font-display tracking-widest uppercase transition-all duration-300 active:scale-95
        ${active
          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.7)]'
          : 'text-cyan-400/60 border border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
        }`}
    >
      {children}
    </button>
  )
}

export default function SetupFlow() {
  const { mode, category: initCat, difficulty: initDiff, timeLimit: initTime,
          configure, setScene } = useGameStore()

  const sfx     = useSfx()
  const haptics = useHaptics()

  // Local selection state — written to store only when LAUNCH is pressed
  const [category,   setCategory]   = useState(initCat)
  const [difficulty, setDifficulty] = useState(initDiff)
  const [timeLimit,  setTimeLimit]  = useState(initTime)

  const launch = () => {
    sfx.click()
    haptics.tap()
    configure(category, difficulty, timeLimit)  // → sets store + scene:'game'
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <Backdrop3D />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 rounded-xl px-5 sm:px-8 py-7 sm:py-10 animate-fade-up">

          <h2 className="font-display font-bold text-xl sm:text-2xl uppercase tracking-[0.2em] text-cyan-400 neon-text text-center mb-1">
            Configure Run
          </h2>
          <p className="text-slate-500 text-[10px] text-center tracking-[0.3em] uppercase mb-8">
            {mode} mode
          </p>

          {/* Category */}
          <div className="mb-6">
            <p className="text-slate-400 text-[10px] tracking-[0.35em] uppercase mb-3">Text Type</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <OptionBtn key={c} active={c === category} onClick={() => setCategory(c)}>{c}</OptionBtn>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="mb-6">
            <p className="text-slate-400 text-[10px] tracking-[0.35em] uppercase mb-3">Difficulty</p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map(d => (
                <OptionBtn key={d} active={d === difficulty} onClick={() => setDifficulty(d)}>{d}</OptionBtn>
              ))}
            </div>
          </div>

          {/* Time limit */}
          <div className="mb-8">
            <p className="text-slate-400 text-[10px] tracking-[0.35em] uppercase mb-3">Time Limit</p>
            <div className="flex flex-wrap gap-2">
              {TIME_LIMITS.map(t => (
                <OptionBtn key={t} active={t === timeLimit} onClick={() => setTimeLimit(t)}>{timeLabel(t)}</OptionBtn>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { sfx.click(); haptics.tap(); setScene('menu') }}
              className="flex-1 py-3 rounded-lg border border-slate-600 text-slate-400 font-display text-xs tracking-widest hover:bg-white/10 hover:text-slate-200 transition-all duration-300 active:scale-95"
            >
              BACK
            </button>
            <button
              onClick={launch}
              className="flex-1 py-3 rounded-lg bg-cyan-500 text-slate-950 font-display text-xs font-bold tracking-widest hover:shadow-[0_0_20px_rgba(6,182,212,0.7)] transition-all duration-300 active:scale-95"
            >
              LAUNCH
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}