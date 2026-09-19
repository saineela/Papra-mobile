import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

export const useAppStore = defineStore('app', () => {
  const theme = ref<ThemeMode>('dark')
  const isInboxFirst = ref(true)

  function applyTheme(mode: ThemeMode) {
    theme.value = mode
    const root = document.documentElement
    if (mode === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
    localStorage.setItem('papra.theme', mode)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', mode === 'light' ? '#fafafa' : '#09090b')
    }
  }

  function initTheme() {
    const stored = localStorage.getItem('papra.theme') as ThemeMode | null
    applyTheme(stored ?? 'dark')
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, isInboxFirst, applyTheme, initTheme, toggleTheme }
})
