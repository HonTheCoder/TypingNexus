// ─────────────────────────────────────────────────────────────────────────────
// components/game/TypingGame.jsx  —  fixed mobile layout
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { X } from 'lucide-react'
import Backdrop3D from '../three/Backdrop3D'
import PostGameModal from './PostGameModal'
import ConfirmModal from './ConfirmModal'
import VirtualKeyboard from './VirtualKeyboard'
import { useTypingEngine } from '../../hooks/useTypingEngine'
import { useHaptics } from '../../hooks/useHaptics'
import { fetchText } from '../../services/textProvider'
import { useSfx, useBGM } from '../../hooks/useAudio'
import { useGameStore, timeLabel } from '../../store/useGameStore'

/* ── WORDS MODE ──────────────────────────────────────────────────────────────*/
function FocusedWord({ target, typed, wordIndex }) {
  const extra = typed.slice(target.length)
  return (
    <div key={wordIndex} className="animate-word-pop text-center w-full px-2">
      <p className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-[0.1em] break-all leading-tight">
        {target.split('').map((ch, i) => {
          let cls = 'text-slate-300/70'
          if (i < typed.length) cls = typed[i] === ch
            ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]'
            : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'
          const caret = i === typed.length ? 'border-b-[3px] border-cyan-400 animate-pulse' : ''
          return <span key={i} className={`${cls} ${caret} transition-colors duration-75`}>{ch}</span>
        })}
        {extra && <span className="text-red-500">{extra}</span>}
      </p>
    </div>
  )
}

/* ── PARAGRAPH MODE ──────────────────────────────────────────────────────────*/
const LINE_CHAR_LIMIT = 32
const LINE_HEIGHT = 44

function buildLines(words) {
  const lines = []
  let current = [], len = 0
  words.forEach((word, index) => {
    if (len + word.length + 1 > LINE_CHAR_LIMIT && current.length > 0) {
      lines.push(current); current = []; len = 0
    }
    current.push({ word, index })
    len += word.length + 1
  })
  if (current.length) lines.push(current)
  return lines
}

function ParagraphStream({ words, wordIndex, typed }) {
  const lines = useMemo(() => buildLines(words), [words])
  const lineOfWord = useMemo(() => {
    const map = {}
    lines.forEach((line, li) => line.forEach(({ index }) => { map[index] = li }))
    return map
  }, [lines])
  const activeLine = lineOfWord[wordIndex] ?? 0
  const offset = Math.max(0, activeLine - 1)

  return (
    <div className="w-full max-w-sm mx-auto px-3">
      <div className="overflow-hidden" style={{ height: LINE_HEIGHT * 3 }}>
        <div className="transition-transform duration-300 ease-out"
          style={{ transform: `translateY(-${offset * LINE_HEIGHT}px)` }}>
          {lines.map((line, li) => {
            const isDone = li < activeLine
            const isActive = li === activeLine
            return (
              <div key={li}
                className={`flex items-center text-left whitespace-nowrap font-mono text-lg tracking-wide transition-opacity duration-300
                  ${isDone ? 'opacity-20' : isActive ? 'opacity-100' : 'opacity-50'}`}
                style={{ height: LINE_HEIGHT }}>
                <span>
                  {line.map(({ word, index }) => {
                    if (index < wordIndex) return <span key={index} className="text-emerald-500/60">{word} </span>
                    if (index > wordIndex) return <span key={index} className="text-slate-400/80">{word} </span>
                    const extra = typed.slice(word.length)
                    return (
                      <span key={index}>
                        {word.split('').map((ch, i) => {
                          let cls = 'text-slate-200'
                          if (i < typed.length) cls = typed[i] === ch
                            ? 'text-emerald-400' : 'text-red-500'
                          const caret = i === typed.length ? 'border-b-2 border-cyan-400 animate-pulse' : ''
                          return <span key={i} className={`${cls} ${caret}`}>{ch}</span>
                        })}
                        {extra && <span className="text-red-500">{extra}</span>}
                        {' '}
                      </span>
                    )
                  })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────────*/
export default function TypingGame() {
  const { mode, category, difficulty, timeLimit, setScene } = useGameStore()
  const sfx = useSfx()
  const haptics = useHaptics()
  useBGM('game')   // plays start.mp3, stops on unmount

  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmExit, setConfirmExit] = useState(false)
  const [finalTelemetry, setFinalTelemetry] = useState(null)

  const loadText = useCallback(async () => {
    setLoading(true)
    setWords(await fetchText(category, difficulty))
    setLoading(false)
  }, [category, difficulty])

  useEffect(() => { loadText() }, [loadText])

  const engine = useTypingEngine(words, timeLimit, {
    onChar:  () => { sfx.type();  haptics.correct() },
    onError: () => { sfx.error(); haptics.mistake() },
    onWord:  sfx.word,
  })

  useEffect(() => {
    if (engine.status === 'finished' && !finalTelemetry) {
      setFinalTelemetry(engine.getTelemetry())
    }
    if (engine.status === 'idle') setFinalTelemetry(null)
  }, [engine.status]) // eslint-disable-line

  // Physical keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ') e.preventDefault()
      engine.handleKey(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine])

  // Virtual keyboard
  const handleVirtualKey = useCallback((char) => {
    engine.handleKey({ key: char, preventDefault: () => {} })
  }, [engine])

  const restart = async () => {
    setFinalTelemetry(null)
    await loadText()
    engine.reset()
  }

  const requestExit   = () => { sfx.click(); haptics.tap(); engine.pause(); setConfirmExit(true) }
  const cancelExit    = () => { sfx.click(); setConfirmExit(false); engine.resume() }
  const confirmExitFn = () => { sfx.click(); setScene('menu') }

  // Timer colour — goes red when ≤ 10s
  const timerColor = engine.timeLeft <= 10 ? 'text-red-400' : 'text-yellow-300'

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col overflow-hidden">
      <Backdrop3D />

      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-3 pt-3 pb-2 gap-2 shrink-0">
        {/* Mode badge — hidden on xs to save space */}
        <div className="hidden sm:block bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 rounded-lg px-3 py-1.5 text-[9px] text-slate-400 uppercase tracking-widest whitespace-nowrap">
          {mode} // {category} // {difficulty} // {timeLabel(timeLimit)}
        </div>
        {/* Spacer on mobile so EXIT stays right */}
        <div className="flex-1 sm:flex-none" />
        <button
          onClick={requestExit}
          className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md border border-fuchsia-500/20 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 hover:text-fuchsia-400 hover:border-fuchsia-400 tracking-widest transition-all duration-300 shrink-0"
        >
          <X size={11} /> EXIT
        </button>
      </div>

      {/* ── HUD — single scrolling row, never wraps ────────────────────────── */}
      <div className="relative z-10 shrink-0 px-3 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { label: 'TIME', value: `${engine.timeLeft}s`, color: timerColor },
            { label: 'WPM',  value: engine.wpm,            color: 'text-cyan-400' },
            { label: 'ACC',  value: `${engine.accuracy.toFixed(0)}%`, color: 'text-fuchsia-400' },
            { label: 'ERR',  value: engine.errors,         color: 'text-red-400' },
            ...(mode === 'practice'
              ? [{ label: 'W/S', value: engine.wps.toFixed(1), color: 'text-purple-400' }]
              : []),
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 rounded-lg px-3 py-1.5 min-w-[58px] shrink-0"
            >
              <span className="text-[8px] tracking-[0.2em] text-slate-500 uppercase">{label}</span>
              <span className={`font-display text-lg font-bold leading-tight ${color} neon-text`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── GAME AREA — fills remaining space ─────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 px-3 min-h-0 overflow-hidden">
        {loading ? (
          <p className="text-cyan-400/70 tracking-[0.35em] animate-pulse font-display text-xs">
            LOADING...
          </p>
        ) : (
          <>
            {category === 'paragraph'
              ? <ParagraphStream words={words} wordIndex={engine.wordIndex} typed={engine.typed} />
              : <FocusedWord target={engine.target} typed={engine.typed} wordIndex={engine.wordIndex} />
            }

            {/* Typed buffer */}
            <div className="w-full max-w-xs sm:max-w-sm bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 rounded-lg px-4 py-2.5 text-center">
              <span className="font-display text-xl sm:text-2xl tracking-[0.2em] text-cyan-300 break-all">
                {engine.typed || <span className="opacity-0">_</span>}
                <span className="text-cyan-400 animate-pulse">▌</span>
              </span>
            </div>

            {engine.status === 'idle' && (
              <p className="text-cyan-400/50 text-[10px] tracking-[0.35em] animate-pulse">
                START TYPING TO BEGIN
              </p>
            )}
          </>
        )}
      </div>

      {/* ── VIRTUAL KEYBOARD — mobile only, pinned to bottom ──────────────── */}
      {!loading && engine.status !== 'finished' && (
        <VirtualKeyboard onVirtualKey={handleVirtualKey} />
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {confirmExit && (
        <ConfirmModal
          title="Abort Run?" subtitle="Timer frozen // progress will be lost"
          confirmLabel="YES, EXIT" cancelLabel="NO, RESUME"
          onConfirm={confirmExitFn} onCancel={cancelExit}
        />
      )}

      {engine.status === 'finished' && !confirmExit && (
        <PostGameModal
          mode={mode} category={category} difficulty={difficulty} timeLimit={timeLimit}
          wpm={engine.wpm} accuracy={engine.accuracy} errors={engine.errors} wps={engine.wps}
          mistakes={engine.errors}
          telemetry={finalTelemetry ?? {}}
          onRestart={restart}
          onExit={() => setScene('menu')}
        />
      )}
    </div>
  )
}