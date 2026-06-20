import { useCallback, useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useTypingEngine
//
// New in this version:
//   keyTelemetry ref — tracks per-key timing, press count, and mistake count.
//   Structure: { 'a': { totalMs: 0, count: 0, mistakes: 0 } }
//
//   lastKeyTime ref — timestamp of the previous keypress used to compute
//   the inter-key delta (time taken to press this key after the previous one).
//
//   getTelemetry() — stable getter exposed in the return value so consumers
//   (TypingGame → PostGameModal → KeyboardHeatmap) can read the final snapshot
//   without triggering re-renders during the game.
// ─────────────────────────────────────────────────────────────────────────────

export function useTypingEngine(words, timeLimit, { onChar, onError, onWord } = {}) {
  const [wordIndex, setWordIndex] = useState(0)
  const [typed,     setTyped]     = useState('')
  const [status,    setStatus]    = useState('idle')   // idle | running | finished
  const [paused,    setPaused]    = useState(false)
  const [timeLeft,  setTimeLeft]  = useState(timeLimit)
  const [, force]                 = useState(0)

  const stats        = useRef({ wpmChars: 0, totalKeystrokes: 0, errors: 0, wordsDone: 0 })
  const keyTelemetry = useRef({})   // { key: { totalMs, count, mistakes } }
  const lastKeyTime  = useRef(null) // timestamp of previous registered keypress

  const target = words.length ? words[wordIndex % words.length] : ''

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setWordIndex(0)
    setTyped('')
    setStatus('idle')
    setPaused(false)
    setTimeLeft(timeLimit)
    stats.current        = { wpmChars: 0, totalKeystrokes: 0, errors: 0, wordsDone: 0 }
    keyTelemetry.current = {}
    lastKeyTime.current  = null
  }, [timeLimit])

  useEffect(() => { reset() }, [reset, words])

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'running' || paused) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setStatus('finished'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [status, paused])

  // ── Telemetry helper ──────────────────────────────────────────────────────
  const recordKey = useCallback((key, isMistake) => {
    const now   = performance.now()
    const delta = lastKeyTime.current !== null ? now - lastKeyTime.current : 0
    lastKeyTime.current = now

    const k = key.toLowerCase()
    if (!keyTelemetry.current[k]) {
      keyTelemetry.current[k] = { totalMs: 0, count: 0, mistakes: 0 }
    }
    keyTelemetry.current[k].totalMs  += delta
    keyTelemetry.current[k].count    += 1
    if (isMistake) keyTelemetry.current[k].mistakes += 1
  }, [])

  // Stable getter — returns a deep copy so the heatmap never mutates live data
  const getTelemetry = useCallback(() => {
    const out = {}
    for (const [k, v] of Object.entries(keyTelemetry.current)) {
      out[k] = { ...v }
    }
    return out
  }, [])

  // ── Word advance ──────────────────────────────────────────────────────────
  const advanceWord = useCallback(() => {
    stats.current.wordsDone++
    stats.current.wpmChars++
    onWord?.()
    setWordIndex(i => i + 1)
    setTyped('')
  }, [onWord])

  // ── Core key handler ──────────────────────────────────────────────────────
  const handleKey = useCallback((e) => {
    if (status === 'finished' || paused || !target) return

    if (e.key === 'Backspace') {
      setTyped(v => v.slice(0, -1))
      return
    }
    if (e.key.length !== 1) return
    if (status === 'idle') setStatus('running')

    // Spacebar — word-submit validation
    if (e.key === ' ') {
      if (typed.length > 0 && typed !== target) {
        stats.current.totalKeystrokes++
        stats.current.errors++
        recordKey(' ', true)
        onError?.()
        force(n => n + 1)
      }
      return
    }

    const next       = typed + e.key
    const isMistake  = e.key !== target[typed.length]

    stats.current.totalKeystrokes++
    recordKey(e.key, isMistake)

    if (!isMistake) {
      stats.current.wpmChars++
      onChar?.()
    } else {
      stats.current.errors++
      onError?.()
    }

    if (next === target) {
      advanceWord()
    } else {
      setTyped(next)
    }
    force(n => n + 1)
  }, [status, paused, target, typed, onChar, onError, advanceWord, recordKey])

  const pause  = useCallback(() => setPaused(true),  [])
  const resume = useCallback(() => setPaused(false), [])

  const elapsedSec = Math.max(
    status === 'finished' ? timeLimit : timeLimit - timeLeft, 1
  )
  const { wpmChars, totalKeystrokes, errors, wordsDone } = stats.current

  const wpm      = Math.round((wpmChars / 5) / (elapsedSec / 60))
  const accuracy = totalKeystrokes === 0
    ? 100
    : Math.max(0, Math.min(100, ((totalKeystrokes - errors) / totalKeystrokes) * 100))
  const wps = wordsDone / elapsedSec

  return {
    target, wordIndex, typed, status, paused, timeLeft,
    wpm, accuracy, errors, wordsDone, wps,
    handleKey, reset, pause, resume,
    getTelemetry,   // ← NEW: stable snapshot getter
  }
}