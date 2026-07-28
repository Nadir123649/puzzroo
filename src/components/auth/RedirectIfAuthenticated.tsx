'use client'

import { useEffect, useState } from 'react'
import { isLoggedIn } from '@/lib/auth/frontend-auth'

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Session is already validated by ThemeProvider's ensureSession call
    // Just check if logged in and redirect if necessary
    const checkAndRedirect = () => {
      if (isLoggedIn()) {
        window.location.replace('/')
      }
    }
    
    // Small delay to let ensureSession from providers complete
    const timer = setTimeout(checkAndRedirect, 100)

    // bfcache restores (e.g. pressing Back after an OAuth login) do not re-run
    // the effect body, so re-check on pageshow to avoid a stuck blank screen.
    const onPageShow = () => {
      setTimeout(checkAndRedirect, 100)
    }
    window.addEventListener('pageshow', onPageShow)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  const spinner = (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
    </div>
  )

  // Show spinner briefly while checking auth state
  if (!mounted) return spinner

  return <>{children}</>
}
