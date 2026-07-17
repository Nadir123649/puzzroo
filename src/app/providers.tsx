'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // When the component mounts on the client, we check what class is active on the HTML tag.
    // The HTML tag is pre-configured by an inline block script in layout.tsx to avoid FOUC.
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
    setMounted(true)

    // Service worker handling.
    // The old caching service worker caused stale /login, /signup and other
    // pages to be served from cache. We no longer register it in development.
    // We also proactively unregister any previously-installed worker and clear
    // its caches so existing devices recover. (public/sw.js is now a
    // self-destructing worker that finishes the cleanup on the client too.)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {})
      if (typeof caches !== 'undefined') {
        caches.keys()
          .then((keys) => keys.forEach((key) => caches.delete(key)))
          .catch(() => {})
      }
    }
  }, [])

  const toggleTheme = () => {
    const root = window.document.documentElement
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'

    if (nextTheme === 'dark') {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }

    setTheme(nextTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
