'use client'

import React, { useEffect } from 'react'
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

  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isLoggedIn()) {
      router.replace('/login')
    }
  }, [router])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isLoggedIn()) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300">
      <Navbar />

      <div className="w-full max-w-[1380px] mx-auto px-[20px] pt-[15px] md:pt-[30px] pb-[40px] md:pb-[60px]">
        <div className="flex gap-8">
          <AccountSidebar />
          
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
