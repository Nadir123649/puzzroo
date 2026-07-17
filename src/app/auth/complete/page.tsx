'use client'

import React, { useEffect } from 'react'
import { bootstrapSession } from '@/lib/auth/frontend-auth'

export default function AuthCompletePage() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const user = await bootstrapSession()
      if (cancelled) return
      if (!user) {
        // Session bootstrap failed — fall back to the login page. The email is
        // already verified at this point, so the success banner is shown there.
        window.location.replace('/login?verified=true')
        return
      }
      window.location.replace(user.usernameSet === false ? '/choose-username' : '/')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex flex-col items-center justify-center gap-4">
      <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
      <p className="font-urbanist font-semibold text-[15px] text-[#757575] dark:text-[#BDBDBD]">
        Signing you in…
      </p>
    </div>
  )
}
