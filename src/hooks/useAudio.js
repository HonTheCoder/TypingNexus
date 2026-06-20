// ─────────────────────────────────────────────────────────────────────────────
// hooks/useAudio.js
// – AudioContext is NEVER created at module load time (avoids autoplay block)
// – A single window listener (click + keydown) unlocks the context on the
//   very first user interaction and is then immediately removed
// – Any call to sfx before unlock is silently swallowed (no error spam)
// – Three.js / Canvas state is completely isolated from this module
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'

// ── AudioContext singleton — lazy, never created at import time ──────────────
let _ctx         = null   // AudioContext instance (created on demand)
let _unlocked    = false  // true once the context has been resumed
let _unlockQueue = []     // callbacks waiting for the first unlock

function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      return null   // AudioContext not supported — every sfx call is a no-op
    }
  }
  return _ctx
}

// ── Unlock on first user gesture ─────────────────────────────────────────────
function handleFirstGesture() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      _unlocked = true
      _unlockQueue.forEach(fn => fn())
      _unlockQueue = []
    }).catch(() => { /* silently ignore resume failures */ })
  } else {
    _unlocked = true
  }
  // Remove listeners after first gesture — we only need one unlock
  window.removeEventListener('click',   handleFirstGesture, { capture: true })
  window.removeEventListener('keydown', handleFirstGesture, { capture: true })
  window.removeEventListener('pointerdown', handleFirstGesture, { capture: true })
}

// Register unlock listeners once at module evaluation (passive — no AudioContext yet)
window.addEventListener('click',      handleFirstGesture, { capture: true, once: true })
window.addEventListener('keydown',    handleFirstGesture, { capture: true, once: true })
window.addEventListener('pointerdown',handleFirstGesture, { capture: true, once: true })

// ── Core blip primitive ───────────────────────────────────────────────────────
function blip(freq, dur = 0.06, type = 'square', gain = 0.08) {
  // Silently discard if context isn't ready — no error, no log spam
  if (!_unlocked) return
  const ctx = getCtx()
  if (!ctx || ctx.state !== 'running') return
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type           = type
    o.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + dur)
  } catch {
    // Node creation can still fail on context state transitions — swallow silently
  }
}

// ── SFX palette ──────────────────────────────────────────────────────────────
export const sfx = {
  click: () => blip(520, 0.05, 'triangle', 0.07),
  type:  () => blip(880, 0.04, 'square',   0.05),
  error: () => blip(110, 0.15, 'sawtooth', 0.10),
  word:  () => { blip(660, 0.08); setTimeout(() => blip(990, 0.1), 60) },
  kaboom() {
    if (!_unlocked) return
    const ctx = getCtx()
    if (!ctx || ctx.state !== 'running') return
    try {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(400, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5)
      g.gain.setValueAtTime(0.25, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
      o.connect(g).connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 0.5)
    } catch { /* noop */ }
  },
}

// ── BGM tracks ────────────────────────────────────────────────────────────────
const TRACKS = {
  menu: {
    interval: 480,
    notes: [110, 130.81, 164.81, 196, 164.81, 130.81],
    noteType: 'triangle', noteGain: 0.035, noteDur: 0.45,
    bassEvery: 6, bassFreq: 55, bassGain: 0.06,
  },
  game: {
    interval: 150,
    notes: [220, 261.63, 329.63, 392, 329.63, 392, 440, 392],
    noteType: 'sawtooth', noteGain: 0.025, noteDur: 0.12,
    bassEvery: 4, bassFreq: 82.41, bassGain: 0.08,
  },
}

/**
 * Scene-aware BGM controller. Pass 'menu' or 'game'.
 * Starts only once the AudioContext has been unlocked.
 * Fully silenced when the global audio toggle is OFF.
 */
export function useBGM(track) {
  const audioOn = useGameStore(s => s.audioOn)
  const timer   = useRef(null)

  useEffect(() => {
    clearInterval(timer.current)
    if (!audioOn || !TRACKS[track]) return

    const t    = TRACKS[track]
    let   step = 0

    const start = () => {
      timer.current = setInterval(() => {
        blip(t.notes[step % t.notes.length], t.noteDur, t.noteType, t.noteGain)
        if (step % t.bassEvery === 0) blip(t.bassFreq, t.noteDur * 1.6, 'sine', t.bassGain)
        step++
      }, t.interval)
    }

    if (_unlocked) {
      start()
    } else {
      // Queue start until the user unlocks the context
      _unlockQueue.push(start)
    }

    return () => {
      clearInterval(timer.current)
      // Remove from queue if the effect cleans up before unlock fires
      const idx = _unlockQueue.indexOf(start)
      if (idx !== -1) _unlockQueue.splice(idx, 1)
    }
  }, [audioOn, track])
}

/**
 * Returns sfx functions gated by the global audio toggle.
 * All methods are safe to call before the context is unlocked — they no-op.
 */
export function useSfx() {
  const audioOn = useGameStore(s => s.audioOn)
  return audioOn ? sfx : { click() {}, type() {}, error() {}, word() {}, kaboom() {} }
}