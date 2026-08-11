'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { notify } from '@/lib/toast'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [isUsernameSetupActive, setIsUsernameSetupActive] = useState(false)
  const [lastToastTime, setLastToastTime] = useState(0)

  useEffect(() => {
    // Check if username setup is active
    const checkUsernameSetup = () => {
      if (typeof window !== 'undefined') {
        const flag = sessionStorage.getItem('puzzroo_username_setup_active')
        setIsUsernameSetupActive(flag === 'true')
      }
    }

    // Check on mount
    checkUsernameSetup()

    // Also check on storage changes (in case opened in multiple tabs)
    window.addEventListener('storage', checkUsernameSetup)
    return () => window.removeEventListener('storage', checkUsernameSetup)
  }, [])

  const handleDisabledClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    // Throttle toast to once every 3 seconds
    const now = Date.now()
    if (now - lastToastTime < 3000) return
    
    setLastToastTime(now)
    notify.error('Please set your username first')
  }

  return (
    <footer className="w-full bg-[#F0EDFF] dark:bg-[#1F222A] transition-colors duration-300">
      <div className="w-full max-w-[1380px] mx-auto px-[20px]">

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-5 min-h-[54px]">

          {/* Copyright */}
          <div className="w-full md:w-auto flex justify-center md:justify-start">
            <p className="font-urbanist font-medium text-[12px] text-[#6949FF] dark:text-[#FAFAFA] text-center md:text-left">
              © {currentYear} Puzzroo
            </p>
          </div>

          {/* Links */}
          <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end gap-3 md:gap-6">

            <Link
              href="/faq"
              prefetch={false}
              onClick={isUsernameSetupActive ? handleDisabledClick : undefined}
              className={`font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap ${
                isUsernameSetupActive ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              FAQ
            </Link>

            <Link
              href="/contact-us"
              prefetch={false}
              onClick={isUsernameSetupActive ? handleDisabledClick : undefined}
              className={`font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap ${
                isUsernameSetupActive ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              Contact Us
            </Link>

            <Link
              href="/privacy-policy"
              prefetch={false}
              onClick={isUsernameSetupActive ? handleDisabledClick : undefined}
              className={`font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap ${
                isUsernameSetupActive ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms-and-conditions"
              prefetch={false}
              onClick={isUsernameSetupActive ? handleDisabledClick : undefined}
              className={`font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap ${
                isUsernameSetupActive ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              Terms and Conditions
            </Link>

          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer