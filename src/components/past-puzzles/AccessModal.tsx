'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'

interface AccessModalProps {
  isOpen: boolean
  onClose: () => void
  gameIcon: string
}

export function AccessModal({ isOpen, onClose, gameIcon }: AccessModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[99999] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-[100000] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div
          className="bg-white dark:bg-[#1F222A] rounded-2xl shadow-2xl max-w-lg w-full relative transform transition-all duration-300 p-8 border-[1.5px] border-[#E0E0E0] dark:border-[#35383F]"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-colors"
            aria-label="Close modal"
          >
            <X size={24} className="text-[#424242] dark:text-[#E0E0E0]" />
          </button>

          {/* Content - Vertical Layout */}
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Icon */}
            <div className="bg-[#F0EDFF] dark:bg-[#35383F] rounded-2xl p-6">
              <Image
                src={gameIcon}
                alt="Game Icon"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>

            {/* Status Badge */}
            <div className="px-4 py-2 rounded-full bg-[#EEEEEE] dark:bg-[#35383F]">
              <span className="font-urbanist font-bold text-[14px] text-[#757575] dark:text-[#BDBDBD]">
                🔒 Locked
              </span>
            </div>

            {/* Text Content */}
            <div className="space-y-3">
              <p className="font-urbanist text-[16px] md:text-[18px] font-semibold text-[#424242] dark:text-[#E0E0E0] leading-relaxed">
                <span className="font-bold text-[#6949FF]">Guest Access:</span> You can play the last 3 days of daily challenges
              </p>
              <p className="font-urbanist text-[16px] md:text-[18px] font-semibold text-[#424242] dark:text-[#E0E0E0] leading-relaxed">
                Register to unlock 7 days of daily challenges!
              </p>
            </div>

            {/* Register Button */}
            <Link href="/signup" className="w-full">
              <button 
                onClick={onClose}
                className="w-full min-w-[280px] h-[46px] px-8 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:ring-offset-2"
              >
                Register Now
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
