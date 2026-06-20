// ─────────────────────────────────────────────────────────────────────────────
// components/game/PostGameModal.jsx  —  mobile-responsive
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Check, X, Loader2, WifiOff } from 'lucide-react'
import { saveScore } from '../../firebase/leaderboard'
import { isFirebaseAvailable } from '../../firebase/config'
import { timeLabel } from '../../store/useGameStore'
import { useSfx } from '../../hooks/useAudio'
import { useHaptics } from '../../hooks/useHaptics'
import ConfirmModal from './ConfirmModal'
import KeyboardHeatmap from './KeyboardHeatmap'

const SUBMIT_TIMEOUT_MS = 5_000

const Stat = ({ label, value, color, glow }) => (
  <div className={`flex flex-col items-center justify-center px-2 sm:px-4 py-2 sm:py-3 rounded-lg border
    ${glow
      ? 'border-pink-500/50 bg-pink-500/10 shadow-[0_0_18px_rgba(236,72,153,0.35)]'
      : 'border-slate-700/40 bg-slate-800/30'
    }`}>
    <span className="block text-[8px] sm:text-[9px] tracking-[0.25em] text-slate-400 mb-0.5">{label}</span>
    <span className={`block font-display text-xl sm:text-2xl font-bold leading-tight ${color}
      ${glow ? 'drop-shadow-[0_0_8px_rgba(236,72,153,0.7)]' : 'neon-text'}`}>
      {value}
    </span>
  </div>
)

export default function PostGameModal({
  mode, category, difficulty, timeLimit,
  wpm, accuracy, errors, wps,
  mistakes, telemetry,
  onRestart, onExit,
}) {
  const sfx      = useSfx()
  const haptics  = useHaptics()

  const [name,         setName]         = useState('')
  const [confirming,   setConfirming]   = useState(false)
  const [submitStatus, setSubmitStatus] = useState('idle')

  const isRanked     = mode === 'ranked'
  const navLocked    = submitStatus === 'loading'
  const mistakeCount = mistakes ?? errors ?? 0

  const requestSubmit = () => {
    if (!name.trim() || navLocked || submitStatus === 'success') return
    sfx.click(); haptics.tap()
    if (!isFirebaseAvailable) { setSubmitStatus('unreachable'); return }
    setConfirming(true)
  }

  const confirmedSubmit = async () => {
    sfx.click(); haptics.tap()
    setConfirming(false)
    setSubmitStatus('loading')
    let succeeded = false, timedOut = false

    const guard = new Promise((_, reject) =>
      setTimeout(() => { timedOut = true; reject(new Error('timeout')) }, SUBMIT_TIMEOUT_MS)
    )
    try {
      await Promise.race([
        saveScore({ name: name.trim(), wpm, accuracy, category, difficulty, timeLimit, mistakes: mistakeCount }),
        guard,
      ])
      succeeded = true
    } catch (err) {
      console.warn('[PostGameModal] save failed:', err.message)
    } finally {
      if (succeeded)                             setSubmitStatus('success')
      else if (timedOut || !isFirebaseAvailable) setSubmitStatus('unreachable')
      else                                       setSubmitStatus('error')
    }
  }

  const SubmitBtn = () => {
    const base = 'h-11 px-4 rounded-lg font-display text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-300'
    switch (submitStatus) {
      case 'loading':     return <button disabled className={`${base} bg-cyan-500/40 text-slate-950 cursor-not-allowed`}><Loader2 size={14} className="animate-spin" />SAVING</button>
      case 'success':     return <button disabled className={`${base} bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.7)] cursor-not-allowed`}><Check size={14} strokeWidth={3} />SAVED</button>
      case 'unreachable': return <button disabled className={`${base} bg-transparent border-2 border-orange-500 text-orange-400 cursor-not-allowed`}><WifiOff size={14} />UNREACHABLE</button>
      case 'error':       return <button onClick={requestSubmit} className={`${base} bg-transparent border-2 border-red-500 text-red-400 hover:bg-red-500/20`}><X size={14} strokeWidth={3} />RETRY</button>
      default:            return <button onClick={requestSubmit} disabled={!name.trim()} className={`${base} bg-cyan-500 text-slate-950 disabled:opacity-30 hover:shadow-[0_0_15px_rgba(6,182,212,0.6)]`}>SUBMIT</button>
    }
  }

  const StatusMsg = () => {
    if (submitStatus === 'error')       return <p className="text-red-400    text-[10px] mt-2 tracking-[0.2em]">UPLINK FAILED — RETRY</p>
    if (submitStatus === 'unreachable') return <p className="text-orange-400 text-[10px] mt-2 tracking-[0.2em]">SERVER UNREACHABLE — SCORE NOT SAVED</p>
    if (submitStatus === 'success')     return <p className="text-emerald-400 text-[10px] mt-2 tracking-[0.2em] neon-text">RECORD TRANSMITTED</p>
    return null
  }

  return (
    // Full-screen overlay, scrollable on mobile so heatmap is reachable
    <div className="absolute inset-0 z-30 bg-[#010110]/85 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start sm:items-center justify-center px-3 py-5 sm:py-8">
        <div className="w-full max-w-xl bg-slate-900/70 backdrop-blur-md border border-fuchsia-500/30 rounded-xl px-4 sm:px-8 py-7 sm:py-10 text-center shadow-[0_0_40px_rgba(217,70,239,0.3)] animate-fade-up">

          {/* Header */}
          <h2 className="font-display font-bold text-xl sm:text-3xl uppercase tracking-[0.2em] text-fuchsia-400 neon-text mb-1">
            Run Complete
          </h2>
          <span className="block text-slate-400 text-[9px] sm:text-xs tracking-[0.25em] mb-6 uppercase">
            {category} // {difficulty} // {timeLabel(timeLimit)}
          </span>

          {/* Stats — 2×2 on mobile, 4-wide on sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
            <Stat label="WPM"      value={wpm}                       color="text-cyan-400"   />
            <Stat label="ACCURACY" value={`${accuracy.toFixed(1)}%`} color="text-yellow-300" />
            {mode === 'practice'
              ? <Stat label="W/SEC"   value={wps.toFixed(2)} color="text-purple-400" />
              : <Stat label="ERRORS"  value={errors}         color="text-red-400"    />
            }
            <Stat label="MISTAKES" value={mistakeCount} color="text-pink-400" glow />
          </div>

          {/* Keyboard Heatmap */}
          {telemetry && Object.keys(telemetry).length > 0 && (
            <div className="mb-6 p-3 sm:p-4 rounded-xl border border-fuchsia-500/20 bg-slate-950/40 overflow-x-auto">
              <p className="text-fuchsia-400 text-[9px] tracking-[0.35em] uppercase mb-3">
                Key Performance Map
              </p>
              <div className="min-w-[280px]">
                <KeyboardHeatmap telemetry={telemetry} />
              </div>
            </div>
          )}

          {/* Score submission */}
          {isRanked && (
            <div className="mb-6">
              <p className="text-cyan-400 text-[10px] sm:text-xs mb-3 tracking-widest uppercase">
                Save to World Records?
              </p>
              <div className="flex items-stretch gap-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={16}
                  placeholder="ENTER NAME"
                  disabled={navLocked || submitStatus === 'success'}
                  onKeyDown={e => e.key === 'Enter' && requestSubmit()}
                  className="h-11 flex-1 min-w-0 bg-black/40 border border-cyan-500/40 rounded-lg px-3 text-cyan-300 text-sm placeholder-slate-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all duration-300"
                />
                <SubmitBtn />
              </div>
              <StatusMsg />
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => { sfx.click(); haptics.tap(); onRestart() }}
              disabled={navLocked}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg border border-fuchsia-500/50 text-fuchsia-400 font-display text-xs tracking-widest hover:bg-fuchsia-500/20 hover:border-fuchsia-400 disabled:opacity-40 transition-all duration-300 active:scale-95"
            >
              {isRanked ? 'RESTART' : 'RETRY'}
            </button>
            <button
              onClick={() => { sfx.click(); haptics.tap(); onExit() }}
              disabled={navLocked}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg border border-slate-600 text-slate-400 font-display text-xs tracking-widest hover:bg-white/10 hover:text-slate-200 disabled:opacity-40 transition-all duration-300 active:scale-95"
            >
              EXIT
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirming && (
        <ConfirmModal
          title="Log This Score?" subtitle="Final verification // Firestore uplink"
          confirmLabel="YES, LOG IT" cancelLabel="NO, GO BACK"
          onConfirm={confirmedSubmit}
          onCancel={() => { sfx.click(); setConfirming(false) }}
        >
          <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-4 text-left space-y-2 text-sm">
            <p className="text-slate-300">PILOT:    <span className="text-cyan-300 font-display">{name.trim()}</span></p>
            <p className="text-slate-300">WPM:      <span className="text-cyan-300 font-display">{wpm}</span></p>
            <p className="text-slate-300">ACCURACY: <span className="text-cyan-300 font-display">{accuracy.toFixed(1)}%</span></p>
            <p className="text-slate-300">MISTAKES: <span className="text-pink-400  font-display">{mistakeCount}</span></p>
            <p className="text-slate-300">MODE:     <span className="text-cyan-300 font-display uppercase text-xs">{category} // {difficulty} // {timeLabel(timeLimit)}</span></p>
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}