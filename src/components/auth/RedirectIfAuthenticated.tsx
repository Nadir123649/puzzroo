'use client'

import { useEffect, useState } from 'react'
import { isLoggedIn } from '@/lib/auth/frontend-auth'

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if user is already logged in
    const checkAndRedirect = () => {
      if (isLoggedIn()) {
        window.location.replace('/')
      } else {
        // Not logged in - show the login/signup form
        setValidated(true)
      }
    }

    // Wait for ensureSession from providers.tsx to complete (max 200ms)
    const timer = setTimeout(checkAndRedirect, 200)

    // bfcache restores (e.g. pressing Back after an OAuth login) do not re-run
    // the effect body, so re-check on pageshow to avoid a stuck blank screen.
    const onPageShow = () => {
      setValidated(false)
      setTimeout(checkAndRedirect, 200)
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
