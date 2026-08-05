'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeOverlay() {
  const [isActive, setIsActive] = useState(false)
  const [overlayBg, setOverlayBg] = useState('#ffffff')
  const previousThemeRef = useRef<string | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const frameRef = useRef<number | null>(null)

  const { theme, mounted } = useTheme()

  useEffect(() => {
    if (!mounted) return

    const isDarkToLight = previousThemeRef.current === 'dark' && theme === 'light'
    const isLightToDark = previousThemeRef.current === 'light' && theme === 'dark'

    if (isDarkToLight) {
      setOverlayBg('#ffffff')
    } else if (isLightToDark) {
      setOverlayBg('#181A20')
    } else {
      setIsActive(false)
      return
    }

    previousThemeRef.current = theme

    setIsActive(true)

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = requestAnimationFrame(() => {
      setIsActive(true)
    })

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [theme, mounted])

  useEffect(() => {
    if (isActive && animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }

    if (isActive) {
      animationTimeoutRef.current = setTimeout(() => {
        setIsActive(false)
      }, 450)
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
    }
  }, [isActive])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div
      className={`theme-overlay ${isActive ? 'active' : ''}`}
      style={{ backgroundColor: overlayBg }}
      aria-hidden="true"
    />
  )
}