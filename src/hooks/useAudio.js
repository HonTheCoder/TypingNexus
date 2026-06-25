// ─────────────────────────────────────────────────────────────────────────────
// hooks/useAudio.js
//
// Fixes in this version:
//   1. AudioContext is NEVER created until inside a confirmed user-gesture
//      handler — solves "AudioContext was not allowed to start"
//   2. unlock listeners use { passive: true } so they never block scrolling
//   3. MP3 BGM via <Audio> elements (loop, volume 0.35)
//   4. useBGM respects musicOn; useSfx respects audioOn (separate toggles)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'

// ── Unlock state ──────────────────────────────────────────────────────────────
let _ctx         = null   // created ONLY inside a gesture handler
let _unlocked    = false
const _sfxQueue  = []     // SFX callbacks waiting for unlock
const _bgmQueue  = []     // BGM play() calls waiting for unlock

// DO NOT call getCtx() at module scope — only call it inside a gesture handler
function getCtx() {
  if (_ctx) return _ctx
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    return null
  }
  return _ctx
}

// ── First-gesture unlock ──────────────────────────────────────────────────────
// { passive: true } — never blocks scrolling, satisfies Chrome's requirement
// The AudioContext is created HERE, inside the gesture callback, which is the
// only place the browser allows it without the autoplay warning.
function handleFirstGesture() {
  if (_unlocked) return

  const ctx = getCtx()   // safe — we are now inside a user gesture
  if (!ctx) return

  const resume = () => {
    _unlocked = true
    _sfxQueue.forEach(fn => { try { fn() } catch {} })
    _sfxQueue.length = 0
    _bgmQueue.forEach(fn => { try { fn() } catch {} })
    _bgmQueue.length = 0
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(resume).catch(() => {})
  } else {
    resume()
  }
}

// Register with { passive: true } — no preventDefault needed on these
window.addEventListener('click',       handleFirstGesture, { passive: true, once: true })
window.addEventListener('keydown',     handleFirstGesture, { passive: true, once: true })
window.addEventListener('pointerdown', handleFirstGesture, { passive: true, once: true })
window.addEventListener('touchstart',  handleFirstGesture, { passive: true, once: true })

// ── SFX bleeps ────────────────────────────────────────────────────────────────
function blip(freq, dur = 0.06, type = 'square', gain = 0.08) {
  if (!_unlocked) return   // silently skip before unlock — no error spam
  const ctx = getCtx()
  if (!ctx || ctx.state !== 'running') return
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type            = type
    o.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + dur)
  } catch { /* noop */ }
}

export const sfx = {
  click:  () => blip(520, 0.05, 'triangle', 0.07),
  type:   () => blip(880, 0.04, 'square',   0.05),
  error:  () => blip(110, 0.15, 'sawtooth', 0.10),
  word:   () => { blip(660, 0.08); setTimeout(() => blip(990, 0.1), 60) },
  kaboom: () => {
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

// ── MP3 BGM ───────────────────────────────────────────────────────────────────
const TRACK_SRC = {
  menu: '/audio/mainmenu.mp3',
  game: '/audio/start.mp3',
  ufo:  '/audio/ufo.mp3',
}

const audioEls = {}

function getAudioEl(track) {
  if (!audioEls[track]) {
    const el        = new Audio(TRACK_SRC[track])
    el.loop         = true
    el.volume       = 0.35
    el.preload      = 'auto'
    audioEls[track] = el
  }
  return audioEls[track]
}

function stopAllExcept(keepTrack) {
  Object.entries(audioEls).forEach(([t, el]) => {
    if (t !== keepTrack && !el.paused) {
      el.pause()
      el.currentTime = 0
    }
  })
}

// ── useBGM ────────────────────────────────────────────────────────────────────
export function useBGM(track) {
  const musicOn = useGameStore(s => s.musicOn)

  useEffect(() => {
    if (!TRACK_SRC[track]) return

    if (!musicOn) {
      Object.values(audioEls).forEach(e => { if (!e.paused) e.pause() })
      return
    }

    const el = getAudioEl(track)
    stopAllExcept(track)

    const play = () => {
      if (el.paused) {
        el.play().catch(() => {
          // Browser still blocking — queue for next gesture
          _bgmQueue.push(() => el.play().catch(() => {}))
        })
      }
    }

    if (_unlocked) {
      play()
    } else {
      _bgmQueue.push(play)
    }

    return () => {
      el.pause()
    }
  }, [musicOn, track])
}

// ── useSfx ────────────────────────────────────────────────────────────────────
export function useSfx() {
  const audioOn = useGameStore(s => s.audioOn)
  return audioOn
    ? sfx
    : { click() {}, type() {}, error() {}, word() {}, kaboom() {} }
}