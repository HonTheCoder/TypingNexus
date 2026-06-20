// ─────────────────────────────────────────────────────────────────────────────
// components/game/KeyboardHeatmap.jsx  —  mobile-responsive version
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

const ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
]

const WIDE_KEYS = [
  { label: '⌫', key: 'backspace' },
  { label: 'SPC', key: ' ' },
  { label: '↵',  key: 'enter' },
]

const FAST_MS   = 180
const MEDIUM_MS = 350

function getKeyStyle(tel) {
  if (!tel || tel.count === 0) {
    return {
      text:   'text-slate-500/40',
      bg:     'bg-slate-800/20 border-slate-700/15',
      shadow: '',
    }
  }
  const avgMs     = tel.totalMs / tel.count
  const errorRate = tel.mistakes / tel.count

  if (errorRate >= 0.25) return {
    text:   'text-rose-400',
    bg:     'bg-rose-500/10 border-rose-500/40',
    shadow: 'drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]',
  }
  if (avgMs <= FAST_MS) return {
    text:   'text-emerald-400',
    bg:     'bg-emerald-500/10 border-emerald-500/40',
    shadow: 'drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]',
  }
  if (avgMs <= MEDIUM_MS) return {
    text:   'text-cyan-400',
    bg:     'bg-cyan-500/10 border-cyan-500/30',
    shadow: 'drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]',
  }
  return {
    text:   'text-purple-400/70',
    bg:     'bg-purple-500/10 border-purple-500/20',
    shadow: '',
  }
}

function msToKeyWpm(avgMs) {
  if (!avgMs || avgMs <= 0) return 0
  return Math.round((60_000 / avgMs) / 5)
}

function KeyCap({ label, keyId, telemetry, wide }) {
  const [hovered, setHovered] = useState(false)
  const tel   = telemetry[keyId] ?? null
  const style = getKeyStyle(tel)

  const tooltip = tel && tel.count > 0
    ? `${label.toUpperCase()} — ${msToKeyWpm(tel.totalMs / tel.count)} WPM · ${tel.mistakes} err`
    : `${label.toUpperCase()} — unused`

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`
        flex items-center justify-center rounded border
        font-display font-bold uppercase select-none cursor-default
        transition-all duration-200
        ${wide ? 'h-7 px-1.5 text-[8px]' : 'h-7 w-7 text-[9px]'}
        ${style.text} ${style.bg} ${style.shadow}
      `}>
        {label}
      </div>

      {hovered && (
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
          px-2 py-1 rounded bg-slate-900/95 border border-cyan-500/30
          text-cyan-300 text-[9px] tracking-[0.05em] whitespace-nowrap
          pointer-events-none shadow-[0_0_10px_rgba(6,182,212,0.25)]
        ">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-slate-900/95" />
        </div>
      )}
    </div>
  )
}

export default function KeyboardHeatmap({ telemetry }) {
  const tel = Object.fromEntries(
    Object.entries(telemetry).map(([k, v]) => [k.toLowerCase(), v])
  )

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mb-3 text-[8px] tracking-[0.15em] uppercase">
        {[
          { color: 'bg-emerald-400', label: 'Fast',       glow: 'drop-shadow-[0_0_3px_rgba(52,211,153,0.8)]' },
          { color: 'bg-cyan-400',    label: 'Med',        glow: '' },
          { color: 'bg-purple-400',  label: 'Slow',       glow: '' },
          { color: 'bg-rose-400',    label: 'Errors',     glow: 'drop-shadow-[0_0_3px_rgba(244,63,94,0.8)]' },
          { color: 'bg-slate-500/30',label: 'Unused',     glow: '' },
        ].map(({ color, label, glow }) => (
          <span key={label} className="flex items-center gap-1 text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full ${color} ${glow}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Keyboard — all rows centered, compact for mobile */}
      <div className="flex flex-col items-center gap-1">

        {/* Row 0 */}
        <div className="flex gap-1">
          {ROWS[0].map(k => <KeyCap key={k} label={k} keyId={k} telemetry={tel} />)}
        </div>

        {/* Row 1 — slight indent */}
        <div className="flex gap-1" style={{ marginLeft: '14px' }}>
          {ROWS[1].map(k => <KeyCap key={k} label={k} keyId={k} telemetry={tel} />)}
        </div>

        {/* Row 2 */}
        <div className="flex gap-1" style={{ marginLeft: '28px' }}>
          {ROWS[2].map(k => <KeyCap key={k} label={k} keyId={k} telemetry={tel} />)}
        </div>

        {/* Wide bottom row */}
        <div className="flex gap-1 mt-0.5">
          {WIDE_KEYS.map(({ label, key }) => (
            <KeyCap key={key} label={label} keyId={key} telemetry={tel} wide />
          ))}
        </div>
      </div>
    </div>
  )
}