// ─────────────────────────────────────────────────────────────────────────────
// components/game/VirtualKeyboard.jsx
//
// Full-width QWERTY on-screen keyboard rendered ONLY on mobile (<md breakpoint).
// - Matches native keyboard muscle memory layout exactly (standard stagger)
// - Premium cyberpunk aesthetic: glassy keys, neon borders, ripple on press
// - onTouchStart (+ onClick fallback) feeds directly into engine.handleKey()
// - Haptic feedback via useHaptics on every tap
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useHaptics } from '../../hooks/useHaptics'

const ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
]

// Ripple flash duration in ms
const FLASH_MS = 140

function Key({ label, keyChar, onVirtualKey, wide, extraClass = '' }) {
  const [flashing, setFlashing] = useState(false)

  const fire = useCallback((e) => {
    e.preventDefault()
    setFlashing(true)
    setTimeout(() => setFlashing(false), FLASH_MS)
    onVirtualKey(keyChar)
  }, [keyChar, onVirtualKey])

  const base = [
    'relative flex items-center justify-center select-none',
    'rounded-md border font-display text-xs font-bold uppercase',
    'transition-all duration-75 active:scale-95',
    'h-10',
    wide || 'flex-1',
    extraClass,
  ].join(' ')

  const idle  = 'bg-slate-900/70 border-cyan-500/25 text-cyan-300/80 backdrop-blur-sm'
  const flash = 'bg-cyan-400/20 border-cyan-400 text-cyan-100 shadow-[0_0_14px_rgba(6,182,212,0.8)]'

  return (
    <button
      className={`${base} ${flashing ? flash : idle}`}
      onTouchStart={fire}
      onClick={fire}
      tabIndex={-1}           // keep focus on the game, not the button
      aria-label={label}
    >
      {label}
      {/* ripple overlay */}
      {flashing && (
        <span className="absolute inset-0 rounded-md animate-ping bg-cyan-400/20 pointer-events-none" />
      )}
    </button>
  )
}

export default function VirtualKeyboard({ onVirtualKey }) {
  const haptics = useHaptics()

  // Wraps the engine call with haptics — the engine itself decides correct/mistake
  // We do a simple tap haptic here; the engine's onChar/onError callbacks handle
  // correct/mistake haptics from TypingGame.
  const handleKey = useCallback((char) => {
    haptics.tap()
    onVirtualKey(char)
  }, [haptics, onVirtualKey])

  return (
    // md:hidden — this entire component is invisible on desktop
    <div className="md:hidden w-full px-1 pb-2 pt-1 bg-slate-950/90 backdrop-blur-md border-t border-cyan-500/20 select-none">

      {/* Row 0 — Q to P */}
      <div className="flex gap-[3px] mb-[3px]">
        {ROWS[0].map(k => (
          <Key key={k} label={k} keyChar={k} onVirtualKey={handleKey} />
        ))}
      </div>

      {/* Row 1 — A to L (standard half-key offset via padding) */}
      <div className="flex gap-[3px] mb-[3px] px-[4%]">
        {ROWS[1].map(k => (
          <Key key={k} label={k} keyChar={k} onVirtualKey={handleKey} />
        ))}
      </div>

      {/* Row 2 — Z to M + Backspace */}
      <div className="flex gap-[3px] mb-[3px]">
        <Key label="⌫" keyChar="Backspace" onVirtualKey={handleKey}
          wide="w-[14%]"
          extraClass="bg-rose-900/40 border-rose-500/30 text-rose-400" />
        <div className="flex gap-[3px] flex-1">
          {ROWS[2].map(k => (
            <Key key={k} label={k} keyChar={k} onVirtualKey={handleKey} />
          ))}
        </div>
        {/* Right-side Return placeholder for visual balance */}
        <div className="w-[14%]" />
      </div>

      {/* Bottom row — Space */}
      <div className="flex gap-[3px]">
        <div className="w-[20%]" />
        <Key
          label="SPACE"
          keyChar=" "
          onVirtualKey={handleKey}
          wide="flex-1"
          extraClass="bg-fuchsia-900/30 border-fuchsia-500/30 text-fuchsia-300 tracking-widest text-[10px]"
        />
        <div className="w-[20%]" />
      </div>
    </div>
  )
}