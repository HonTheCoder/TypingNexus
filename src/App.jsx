import { useGameStore } from './store/useGameStore'
import { useBGM } from './hooks/useAudio'
import MainMenu from './components/menu/MainMenu'
import SetupFlow from './components/game/SetupFlow'
import TypingGame from './components/game/TypingGame'
import UfoMode from './components/ufo/UfoMode'
import Leaderboard from './components/leaderboard/Leaderboard'
import Settings from './components/settings/Settings'

const SCENES = {
  menu: MainMenu,
  setup: SetupFlow,
  game: TypingGame,
  ufo: UfoMode,
  leaderboard: Leaderboard,
  settings: Settings
}

const BGM_MAP = {
  menu: 'menu', setup: 'menu', leaderboard: 'menu', settings: 'menu',
  game: 'game', ufo: 'game'
}

export default function App() {
  const scene = useGameStore(s => s.scene)
  useBGM(BGM_MAP[scene] ?? 'menu')
  const Scene = SCENES[scene] ?? MainMenu

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#010110]">
      <Scene />
    </div>
  )
}
