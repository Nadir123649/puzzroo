'use client'

import { useEffect, useState } from 'react'
import { isLoggedIn, ensureSession } from '@/lib/auth/frontend-auth'

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [validated, setValidated] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Validate the session first: a stale/expired accessToken must be cleared
    // (so we don't bounce a logged-OUT user away from /login), while a live
    // session is refreshed. Only then decide whether to redirect.
    const run = async () => {
      await ensureSession()
      if (isLoggedIn()) {
        window.location.replace('/')
      } else {
        // Session was stale/expired and cleared — reveal the login form.
        setValidated(true)
      }
    }
    run()

    // bfcache restores (e.g. pressing Back after an OAuth login) do not re-run
    // the effect body, so re-check on pageshow to avoid a stuck blank screen.
    const onPageShow = () => run()
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const spinner = (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
    </div>
  )

  // Hold the spinner until mounted AND session-validated, so a stale token is
  // cleared before we decide to show the form or bounce to home.
  if (!mounted || !validated) return spinner

  return <>{children}</>
}
