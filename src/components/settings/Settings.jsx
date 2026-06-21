// ─────────────────────────────────────────────────────────────────────────────
// components/settings/Settings.jsx
// ─────────────────────────────────────────────────────────────────────────────

import Backdrop3D from '../three/Backdrop3D'
import { useGameStore } from '../../store/useGameStore'
import { useSfx } from '../../hooks/useAudio'
import { useHaptics } from '../../hooks/useHaptics'

const Toggle = ({ on, onClick, color = 'bg-cyan-500', glow = 'rgba(6,182,212,0.7)' }) => (
  <button
    onClick={onClick}
    className={`w-14 h-7 rounded-full relative transition-all duration-300 shrink-0
      ${on ? `${color} shadow-[0_0_14px_${glow}]` : 'bg-slate-700'}`}
  >
    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300
      ${on ? 'left-[calc(100%-26px)]' : 'left-0.5'}`} />
  </button>
)

function Row({ label, sub, on, onToggle, color, glow }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-700/40 last:border-0">
      <div>
        <p className="font-display text-sm tracking-widest uppercase text-cyan-400">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
      </div>
      <Toggle on={on} onClick={onToggle} color={color} glow={glow} />
    </div>
  )
}

export default function Settings() {
  const { theme, audioOn, musicOn, toggleTheme, toggleAudio, toggleMusic, setScene } = useGameStore()
  const sfx     = useSfx()
  const haptics = useHaptics()

  const tap = (fn) => () => { sfx.click(); haptics.tap(); fn() }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <Backdrop3D />

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-purple-600/12 blur-[140px]" />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 overflow-y-auto py-6">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 sm:p-10 shadow-[0_0_40px_rgba(168,85,247,0.15)] animate-fade-up">

          <h2 className="font-display font-bold text-2xl sm:text-3xl uppercase tracking-[0.2em] text-purple-400 neon-text text-center mb-8">
            Settings
          </h2>

          {/* Theme */}
          <Row
            label="Theme"
            sub={theme === 'dark' ? 'DARK MODE (NEON)' : 'LIGHT MODE (DAYBREAK)'}
            on={theme === 'dark'}
            onToggle={tap(toggleTheme)}
            color="bg-purple-500"
            glow="rgba(168,85,247,0.7)"
          />

          {/* SFX */}
          <Row
            label="Sound FX"
            sub={audioOn ? 'KEY CLICKS · ERRORS · EXPLOSIONS — ON' : 'ALL SOUND EFFECTS — OFF'}
            on={audioOn}
            onToggle={tap(toggleAudio)}
            color="bg-cyan-500"
            glow="rgba(6,182,212,0.7)"
          />

          {/* Music */}
          <Row
            label="Music"
            sub={musicOn ? 'MENU · GAME · UFO SOUNDTRACKS — ON' : 'BACKGROUND MUSIC — OFF'}
            on={musicOn}
            onToggle={tap(toggleMusic)}
            color="bg-fuchsia-500"
            glow="rgba(217,70,239,0.7)"
          />

          {/* Credits */}
          <div className="mt-6 pt-5 border-t border-slate-700/40 text-center">
            <p className="font-display text-fuchsia-400 tracking-widest uppercase text-xs mb-2">Credits</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              TYPING NEXUS // React Three Fiber, Tailwind & Firebase<br />
              Sound FX via Web Audio API<br />
              Music tracks by HoneyBoys Group<br />
              © 2026 HoneyBoys Group
            </p>
          </div>

          <button
            onClick={tap(() => setScene('menu'))}
            className="mt-6 w-full py-2.5 rounded-lg border border-slate-700/50 text-slate-500 hover:text-fuchsia-400 hover:border-fuchsia-500/40 text-[10px] tracking-[0.35em] uppercase transition-all duration-300 active:scale-95"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}