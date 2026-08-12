'use client'

import React from 'react'
import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

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
              className="font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap"
            >
              FAQ
            </Link>

            <Link
              href="/contact-us"
              prefetch={false}
              className="font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap"
            >
              Contact Us
            </Link>

            <Link
              href="/privacy-policy"
              prefetch={false}
              className="font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms-and-conditions"
              prefetch={false}
              className="font-urbanist font-medium text-[12px] text-[#424242] dark:text-[#FAFAFA] hover:text-[#6949FF] transition-colors whitespace-nowrap"
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