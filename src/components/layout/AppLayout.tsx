'use client'

import React from 'react'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'

interface AppLayoutProps {
  children: React.ReactNode
  hideFooter?: boolean
  className?: string
}

/**
 * Common layout component with Navbar and Footer
 * Use this instead of adding Navbar/Footer separately in each page
 */
export function AppLayout({ children, hideFooter = false, className = '' }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex flex-col">
      <Navbar />

      <main className={`flex-1 ${className}`}>
        {children}
      </main>

      {!hideFooter && <Footer />}
    </div>
  )
}
