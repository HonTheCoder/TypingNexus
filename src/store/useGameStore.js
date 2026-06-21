import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useGameStore = create(
  persist(
    (set) => ({
      scene:      'menu',
      mode:       'ranked',
      category:   'words',
      difficulty: 'easy',
      timeLimit:  60,
      theme:      'dark',
      audioOn:    true,   // SFX bleeps
      musicOn:    true,   // MP3 BGM tracks

      setScene:    (scene) => set({ scene }),
      startSetup:  (mode)  => set({ mode, scene: 'setup' }),
      configure:   (category, difficulty, timeLimit) =>
        set({ category, difficulty, timeLimit, scene: 'game' }),

      toggleTheme: () => set(s => {
        const theme = s.theme === 'dark' ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', theme === 'dark')
        return { theme }
      }),

      toggleAudio: () => set(s => ({ audioOn: !s.audioOn })),
      toggleMusic: () => set(s => ({ musicOn: !s.musicOn })),
    }),
    {
      name: 'typing-nexus-settings',
      partialize: (s) => ({ theme: s.theme, audioOn: s.audioOn, musicOn: s.musicOn }),
    }
  )
)

export const CATEGORIES   = ['words', 'paragraph']
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'asian']
export const TIME_LIMITS  = [30, 60, 120, 300]
export const timeLabel    = (t) => (t < 60 ? `${t}s` : `${t / 60}m`)