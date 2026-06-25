// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
//
// BGM is managed HERE only — one single useBGM call at the app level.
// Individual scene components (MainMenu, TypingGame, UfoMode) must NOT call
// useBGM themselves — that caused two Audio elements fighting for the same
// track and double-playing.
//
// BGM_MAP: maps every scene name → track key used by useAudio.js
//   'menu'  → /audio/mainmenu.mp3
//   'game'  → /audio/start.mp3
//   'ufo'   → /audio/ufo.mp3   ← was incorrectly 'game' before
// ─────────────────────────────────────────────────────────────────────────────

import { useGameStore } from './store/useGameStore'
import { useBGM } from './hooks/useAudio'
import MainMenu    from './components/menu/MainMenu'
import SetupFlow   from './components/game/SetupFlow'
import TypingGame  from './components/game/TypingGame'
import UfoMode     from './components/ufo/UfoMode'
import Leaderboard from './components/leaderboard/Leaderboard'
import Settings    from './components/settings/Settings'

const SCENES = {
  menu:        MainMenu,
  setup:       SetupFlow,
  game:        TypingGame,
  ufo:         UfoMode,
  leaderboard: Leaderboard,
  settings:    Settings,
}

// Every scene maps to exactly one BGM track.
// menu/setup/leaderboard/settings all share the menu music.
const BGM_MAP = {
  menu:        'menu',
  setup:       'menu',
  leaderboard: 'menu',
  settings:    'menu',
  game:        'game',   // start.mp3
  ufo:         'ufo',    // ufo.mp3  ← fixed (was 'game')
}

export default function App() {
  const scene = useGameStore(s => s.scene)

  // Single centralised BGM call — controls all music from one place.
  // useBGM will stop the previous track and start the new one whenever
  // `scene` changes, respecting the musicOn toggle automatically.
  useBGM(BGM_MAP[scene] ?? 'menu')

  const Scene = SCENES[scene] ?? MainMenu

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#010110]">
      <Scene />
    </div>
  )
}