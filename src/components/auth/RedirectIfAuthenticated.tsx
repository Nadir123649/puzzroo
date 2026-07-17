'use client'

import { useEffect, useState } from 'react'
import { isLoggedIn } from '@/lib/auth/frontend-auth'

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Hard redirect when authenticated. window.location.replace guarantees the
    // navigation happens even when this page is restored from the browser's
    // back-forward cache (bfcache), which is where the previous `return null`
    // rendered a blank/black screen.
    const redirectIfAuthed = () => {
      if (isLoggedIn()) {
        window.location.replace('/')
      }
    }

    redirectIfAuthed()

    // bfcache restores (e.g. pressing Back after an OAuth login) do not re-run
    // the effect body, so re-check on pageshow to avoid a stuck blank screen.
    const onPageShow = () => redirectIfAuthed()
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const spinner = (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
    </div>
  )

  if (!mounted) return spinner

  // Authenticated: show the spinner (never null) while the redirect completes.
  if (isLoggedIn()) return spinner

  return <>{children}</>
}
