// ─────────────────────────────────────────────────────────────────────────────
// hooks/useAudio.js
//
// Three music tracks using real MP3 files in /public/audio/:
//   mainmenu.mp3  →  useBGM('menu')         used in MainMenu
//   start.mp3     →  useBGM('game')         used in TypingGame
//   ufo.mp3       →  useBGM('ufo')          used in UfoMode
//
// Rules:
//   - AudioContext created lazily on first user gesture (click/keydown/touch)
//   - <audio> elements loop automatically and respect the global audioOn toggle
//   - Toggling audioOn in Settings immediately pauses/resumes the current track
//   - Switching scene cross-fades cleanly (old track paused, new track starts)
//   - SFX bleeps still go through Web Audio API (unchanged)
//   - All code fails silently if the browser blocks audio
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'

// ── Web Audio API unlock (SFX only) ──────────────────────────────────────────
let _ctx      = null
let _unlocked = false
const _queue  = []

function getCtx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  return _ctx
}

function handleFirstGesture() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => { _unlocked = true; _queue.forEach(f => f()); _queue.length = 0 }).catch(() => {})
  } else {
    _unlocked = true
  }
  window.removeEventListener('click',       handleFirstGesture, true)
  window.removeEventListener('keydown',     handleFirstGesture, true)
  window.removeEventListener('pointerdown', handleFirstGesture, true)
}
window.addEventListener('click',       handleFirstGesture, { capture: true, once: true })
window.addEventListener('keydown',     handleFirstGesture, { capture: true, once: true })
window.addEventListener('pointerdown', handleFirstGesture, { capture: true, once: true })

// ── SFX bleeps ────────────────────────────────────────────────────────────────
function blip(freq, dur = 0.06, type = 'square', gain = 0.08) {
  if (!_unlocked) return
  const ctx = getCtx()
  if (!ctx || ctx.state !== 'running') return
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g).connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + dur)
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
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(400, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5)
      g.gain.setValueAtTime(0.25, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.5)
    } catch { /* noop */ }
  },
}

// ── MP3 track map ─────────────────────────────────────────────────────────────
const TRACK_SRC = {
  menu: '/audio/mainmenu.mp3',
  game: '/audio/start.mp3',
  ufo:  '/audio/ufo.mp3',
}

// One shared <audio> element per track, created once and reused
const audioEls = {}

function getAudioEl(track) {
  if (!audioEls[track]) {
    const el         = new Audio(TRACK_SRC[track])
    el.loop          = true
    el.volume        = 0.35
    el.preload       = 'auto'
    audioEls[track]  = el
  }
  return audioEls[track]
}

function stopAllExcept(keepTrack) {
  Object.entries(audioEls).forEach(([track, el]) => {
    if (track !== keepTrack && !el.paused) {
      el.pause()
      el.currentTime = 0
    }
  })
}

// ── useBGM hook ───────────────────────────────────────────────────────────────
// Call with 'menu', 'game', or 'ufo' in the matching scene component.
// Handles play/pause automatically based on audioOn toggle.

export function useBGM(track) {
  const musicOn = useGameStore(s => s.musicOn)

  useEffect(() => {
    if (!TRACK_SRC[track]) return
    const el = getAudioEl(track)

    if (!musicOn) {
      // Mute everything immediately
      Object.values(audioEls).forEach(e => { if (!e.paused) e.pause() })
      return
    }

    // Stop other tracks before starting this one
    stopAllExcept(track)

    const play = () => {
      if (el.paused) {
        el.play().catch(() => {
          _queue.push(() => el.play().catch(() => {}))
        })
      }
    }

    if (_unlocked) {
      play()
    } else {
      _queue.push(play)
    }

    return () => { el.pause() }
  }, [musicOn, track])
}

// ── useSfx hook ───────────────────────────────────────────────────────────────
export function useSfx() {
  const audioOn = useGameStore(s => s.audioOn)
  return audioOn
    ? sfx
    : { click() {}, type() {}, error() {}, word() {}, kaboom() {} }
}