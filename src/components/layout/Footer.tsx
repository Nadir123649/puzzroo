'use client'

import React from 'react'
import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-[#F0EDFF] dark:bg-[#1F222A] transition-colors duration-300">
      <div className="w-full px-[clamp(16px,4vw,80px)]">
        <div className="flex flex-row items-center justify-between gap-4 py-5 min-h-[54px]">
          {/* Left Side: Copyright */}
          <div className="flex items-center">
            <p className="font-urbanist font-medium text-[12px] leading-[100%] tracking-[0.2px] text-[#6949FF] dark:text-[#FAFAFA]">
              © {currentYear} Puzzroo
            </p>
          </div>

          {/* Right Side: Links */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/privacy"
              className="font-urbanist font-medium text-[12px] leading-[100%] tracking-[0.2px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] dark:hover:text-[#6949FF] transition-colors duration-200 whitespace-nowrap"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="font-urbanist font-medium text-[12px] leading-[100%] tracking-[0.2px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] dark:hover:text-[#6949FF] transition-colors duration-200 whitespace-nowrap"
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
