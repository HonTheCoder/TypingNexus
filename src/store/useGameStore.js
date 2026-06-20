import { create } from 'zustand'

export const useGameStore = create((set) => ({
  scene: 'menu',
  mode: 'ranked',
  category: 'words',
  difficulty: 'easy',
  timeLimit: 60,
  theme: 'dark',
  audioOn: true,

  setScene: (scene) => set({ scene }),
  startSetup: (mode) => set({ mode, scene: 'setup' }),
  configure: (category, difficulty, timeLimit) =>
    set({ category, difficulty, timeLimit, scene: 'game' }),
  toggleTheme: () => set(s => {
    const theme = s.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', theme === 'dark')
    return { theme }
  }),
  toggleAudio: () => set(s => ({ audioOn: !s.audioOn }))
}))

export const CATEGORIES = ['words', 'paragraph']
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'asian']
export const TIME_LIMITS = [30, 60, 120, 300]
export const timeLabel = (t) => (t < 60 ? `${t}s` : `${t / 60}m`)
