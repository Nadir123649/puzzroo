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

    // Register PWA service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
        .catch((err) => console.warn('Service Worker registration failed:', err))
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
