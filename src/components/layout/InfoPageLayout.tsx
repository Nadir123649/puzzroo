'use client'

import React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'

interface InfoPageLayoutProps {
  children: React.ReactNode
  title?: string
}

export function InfoPageLayout({ children, title }: InfoPageLayoutProps) {
  return (
    <AppLayout>
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
    </AppLayout>
  )
}

export default InfoPageLayout
