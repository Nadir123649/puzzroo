'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

interface GlobalLoaderContextType {
  isLoading: boolean
  loadingText: string
  showLoader: (text?: string, minDuration?: number) => void
  hideLoader: () => void
}

const GlobalLoaderContext = createContext<GlobalLoaderContextType | undefined>(undefined)

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Loading...')
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hideRequestedRef = useRef(false)

  const showLoader = useCallback((text: string = 'Loading...', minDuration: number = 0) => {
    hideRequestedRef.current = false
    setLoadingText(text)
    setIsLoading(true)

    // If minDuration specified, prevent hiding before that time
    if (minDuration > 0) {
      if (minDurationTimerRef.current) {
        clearTimeout(minDurationTimerRef.current)
      }
      minDurationTimerRef.current = setTimeout(() => {
        if (hideRequestedRef.current) {
          setIsLoading(false)
        }
        minDurationTimerRef.current = null
      }, minDuration)
    }
  }, [])

  const hideLoader = useCallback(() => {
    // If minDuration timer is active, mark hide as requested
    if (minDurationTimerRef.current) {
      hideRequestedRef.current = true
    } else {
      setIsLoading(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (minDurationTimerRef.current) {
        clearTimeout(minDurationTimerRef.current)
      }
    }
  }, [])

  return (
    <GlobalLoaderContext.Provider value={{ isLoading, loadingText, showLoader, hideLoader }}>
      {children}
    </GlobalLoaderContext.Provider>
  )
}

export function useGlobalLoader() {
  const context = useContext(GlobalLoaderContext)
  if (context === undefined) {
    throw new Error('useGlobalLoader must be used within GlobalLoaderProvider')
  }
  return context
}
