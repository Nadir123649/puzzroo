'use client'

import React from 'react'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'

interface InfoPageLayoutProps {
  children: React.ReactNode
  title?: string
}

export function InfoPageLayout({ children, title }: InfoPageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 w-full flex flex-col justify-start">
        <div className="w-full max-w-[1380px] mx-auto px-[20px] pt-[10px] pb-[10px] md:pt-[50px] md:pb-[50px] flex-grow flex flex-col">
          <div className="max-w-[800px] w-full mx-auto flex-grow flex flex-col justify-start">
            {title && (
              <h1 className="font-urbanist font-bold text-[32px] md:text-[48px] leading-[120%] text-[#6949FF] mb-[24px] md:mb-[32px] text-center">
                {title}
              </h1>
            )}
            <div className="flex-grow">
              {children}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

export default InfoPageLayout
