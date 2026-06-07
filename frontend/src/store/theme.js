import { create } from 'zustand'

const STORAGE_KEY = 'ecrm_theme'

export const useTheme = create((set) => ({
  theme: localStorage.getItem(STORAGE_KEY) || 'light',
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },
  init: () => {
    const theme = localStorage.getItem(STORAGE_KEY) || 'light'
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },
}))
