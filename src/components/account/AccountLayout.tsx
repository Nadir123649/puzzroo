'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { AccountSidebar } from '@/components/account/AccountSidebar'
import { isLoggedIn } from '@/lib/auth/frontend-auth'

interface AccountLayoutProps {
  children: React.ReactNode
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Re-check on mount AND whenever auth state changes (logout, session
    // revoke after password change/reset, another tab logging out) so a
    // revoked session is thrown out immediately — no stale logged-in UI.
    const check = () => {
      if (!isLoggedIn()) {
        router.replace('/login')
      } else {
        setAuthChecked(true)
      }
    }
    check()
    window.addEventListener('auth-change', check)
    window.addEventListener('storage', check)
    return () => {
      window.removeEventListener('auth-change', check)
      window.removeEventListener('storage', check)
    }
  }, [router])

  // While we haven't confirmed auth yet, render an invisible placeholder
  // that keeps the same background so there is no white/black flash.
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <Navbar />

      <div className="w-full max-w-[1380px] mx-auto px-[20px] pt-[15px] md:pt-[30px] pb-[40px] md:pb-[60px] flex-grow">
        {authChecked ? (
          <div className="flex gap-8">
            <AccountSidebar />
            
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        ) : (
          <div className="min-h-[400px]" />
        )}
      </div>

      <Footer />
    </div>
  )
}
