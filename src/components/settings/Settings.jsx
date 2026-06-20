import Backdrop3D from '../three/Backdrop3D'
import { useGameStore } from '../../store/useGameStore'

const Toggle = ({ on, onClick }) => (
  <button onClick={onClick}
    className={`w-16 h-8 rounded-full relative transition-all duration-300 cursor-pointer ${on ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.7)]' : 'bg-slate-700'}`}>
    <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${on ? 'left-9' : 'left-1'}`} />
  </button>
)

export default function Settings() {
  const { theme, audioOn, toggleTheme, toggleAudio, setScene } = useGameStore()

  return (
    <div className="absolute inset-0 w-full h-full">
      <Backdrop3D />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-[140px]" />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-purple-500/20 rounded-xl p-10 shadow-[0_0_40px_rgba(168,85,247,0.15)] animate-fade-up">

          <h2 className="font-display font-bold text-3xl uppercase tracking-[0.2em] text-purple-400 neon-text text-center mb-10">
            Settings
          </h2>

          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-display text-cyan-400 tracking-widest uppercase">Theme</p>
              <p className="text-xs text-slate-400">{theme === 'dark' ? 'DARK MODE (NEON)' : 'LIGHT MODE (DAYBREAK)'}</p>
            </div>
            <Toggle on={theme === 'dark'} onClick={toggleTheme} />
          </div>

          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="font-display text-cyan-400 tracking-widest uppercase">Audio</p>
              <p className="text-xs text-slate-400">SFX + SYNTHWAVE BGM LOOP</p>
            </div>
            <Toggle on={audioOn} onClick={toggleAudio} />
          </div>

          <div className="border-t border-slate-700/50 pt-6 text-center">
            <p className="font-display text-fuchsia-400 tracking-widest uppercase mb-2">Credits</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              TYPING NEXUS // React Three Fiber, Tailwind & Firebase<br />
              Audio synthesized live via Web Audio API<br />
              © 2026 HoneyBoys Group
            </p>
          </div>

          <button onClick={() => setScene('menu')}
            className="mt-8 w-full text-slate-500 hover:text-fuchsia-400 text-xs tracking-[0.35em] uppercase transition-colors duration-300 cursor-pointer">
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
