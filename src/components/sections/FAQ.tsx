'use client'

import React, { useState } from 'react'
import { faqData, type FAQItem } from '@/data/faq'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { images } from '@/lib/utils'

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleFAQ(id)
    }
  }

  return (
    <section
      id="faq"
      className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-4 md:py-0 lg:py-14"
    >
      <div className="w-full px-[20px]">
        <div className="flex flex-col gap-7">
          {/* FAQ Header */}
          <div className="w-full flex items-center gap-3">
            <h2 className="font-urbanist font-bold text-[24px] md:text-[40px] leading-[120%] text-[#181A20] dark:text-white transition-colors duration-300">
              FAQs
            </h2>
          </div>

          {/* FAQ List Container */}
          <div className="flex flex-col gap-6 w-full">
            {faqData.map((faq) => (
              <FAQItemComponent
                key={faq.id}
                faq={faq}
                isOpen={openId === faq.id}
                onToggle={() => toggleFAQ(faq.id)}
                onKeyDown={(e) => handleKeyDown(e, faq.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

interface FAQItemComponentProps {
  faq: FAQItem
  isOpen: boolean
  onToggle: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

function FAQItemComponent({ faq, isOpen, onToggle, onKeyDown }: FAQItemComponentProps) {
  return (
    <div
      className={cn(
        'w-full rounded-[20px] p-5 sm:p-6 min-h-[71px] transition-all duration-300 ease-in-out cursor-pointer',
        'bg-[#FFFFFF] dark:bg-[#1F222A] hover:bg-[#f1f1f1] dark:hover:bg-[#1F222A]'
      )}
      style={{
        boxShadow: '0px 4px 60px 0px rgba(0, 0, 0, 0.05)',
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-controls={`faq-answer-${faq.id}`}
      onClick={onToggle}
      onKeyDown={onKeyDown}
    >
      {/* Question and Icon Row */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-urbanist font-bold text-[16px] leading-[120%] text-[#181A20] dark:text-white transition-colors duration-300 flex-1">
          {faq.question}
        </h3>
        
        {/* Dropdown Icon */}
        <div className="flex-shrink-0">
          <Image
            src={images.dropdownIcon}
            alt="Toggle"
            width={12}
            height={10}
            className={cn(
              'w-3 h-2.5 transition-transform duration-300 ease-in-out',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Answer with Animation */}
      <div
        id={`faq-answer-${faq.id}`}
        className={cn(
          'grid transition-all duration-500 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-4 pt-4 border-t border-[#E0E0E0] dark:border-[#35383F]">
            <p className="font-urbanist font-medium text-[12px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[#E0E0E0] transition-colors duration-300">
              {faq.answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FAQ
