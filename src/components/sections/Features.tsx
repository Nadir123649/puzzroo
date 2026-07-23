'use client'

import React from 'react'
import Image from 'next/image'
import { images } from '@/lib/utils'

const featuresLeft = [
  'Unlimited Access to All Games',
  '100% Ad-Free Experience',
  'Daily Exclusive Puzzles',
  'Offline Mode',
  'Progress Tracking & Stats',
  'Family Sharing Access',
]

const featuresRight = [
  'Global & Friends Leaderboards',
  'Custom Game Difficulty & Hints',
  'Access to New Games First',
  'Priority Support',
  'Brain Training Programs',
  'Special Events & Seasonal Challenges',
]

export function Features() {
  return (
    <section
      id="features"
      className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-4 md:py-4 lg:py-8 "
    >
      <div className="w-full px-[20px]">
        {/* MOBILE LAYOUT - Completely Different */}
        <div className="md:hidden flex flex-col gap-7">
          {/* Mobile: Star Icon + Heading (Center-aligned) */}
          <div className="flex items-center justify-center gap-2">
            <Image
              src={images.starIcon}
              alt="Star Icon"
              width={18}
              height={18}
              className="w-[18px] h-[18px] select-none flex-shrink-0"
            />
            <h2 className="font-urbanist font-bold text-[22px] leading-[120%] tracking-[-0.02em] text-[#212121] dark:text-white transition-colors duration-300 text-center whitespace-nowrap">
              Upgrade To Get Exclusive Access.
            </h2>
          </div>

          {/* Mobile: Feature Mobile Image - Max width 395px in centered */}
          <div className="w-full">
            <Image
              src={images.featureMobile}
              alt="Premium Features"
              width={395}
              height={152}
              sizes="100vw"
              className="block w-full h-auto rounded-[12px] object-cover"
            />
          </div>
        </div>

        {/* DESKTOP LAYOUT - Original Design */}
        <div className="hidden md:flex flex-col gap-7">
          <div
            className="w-full relative rounded-[12px] overflow-hidden bg-white dark:bg-[#1F222A] transition-colors duration-300"
            style={{
              boxShadow: '0px 4px 60px 0px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Background Vector Image - Absolute positioned with z-index */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <Image
                src={images.featureBackground}
                alt="Feature Background"
                fill
                className="object-cover object-center opacity-30 dark:opacity-20"
                priority={false}
              />
            </div>

            {/* Content Container - 20px padding left and right */}
            <div className="relative z-10 w-full px-5 py-8 sm:py-10 md:py-12 lg:py-16">
              {/* Heading with Star Icon - Star on LEFT side */}
              <div className="flex items-start gap-3 mb-8 sm:mb-10 md:mb-12">
                <Image
                  src={images.starIcon}
                  alt="Star Icon"
                  width={24}
                  height={24}
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 select-none flex-shrink-0 mt-1 order-first"
                />
                <h2 className="font-urbanist font-bold text-[clamp(1.75rem,5vw,2.75rem)] leading-[120%] tracking-[0%] text-[#424242] dark:text-white transition-colors duration-300">
                  Upgrade To Get Exclusive Access.
                </h2>
              </div>

              {/* Grid Layout: 2 Columns of Features + Purple Box */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_359px] gap-8 lg:gap-12">
                {/* Left Side: Two Column Features Grid - 30px vertical gap */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-[30px]">
                  {/* Left Column Features */}
                  <div className="flex flex-col gap-[30px]">
                    {featuresLeft.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        {/* Check Icon */}
                        <Image
                          src={images.checkIcon}
                          alt="Check"
                          width={24}
                          height={24}
                          className="w-5 h-5 sm:w-6 sm:h-6 select-none flex-shrink-0 mt-0.5"
                        />
                        {/* Feature Text: Font Urbanist, Weight 700, Size 24px, Line height 120% */}
                        <h4 className="font-urbanist font-bold text-[clamp(1rem,3vw,1.5rem)] leading-[120%] tracking-[0%] text-[#424242] dark:text-white transition-colors duration-300">
                          {feature}
                        </h4>
                      </div>
                    ))}
                  </div>

                  {/* Right Column Features */}
                  <div className="flex flex-col gap-[30px]">
                    {featuresRight.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        {/* Check Icon */}
                        <Image
                          src={images.checkIcon}
                          alt="Check"
                          width={24}
                          height={24}
                          className="w-5 h-5 sm:w-6 sm:h-6 select-none flex-shrink-0 mt-0.5"
                        />
                        {/* Feature Text */}
                        <h4 className="font-urbanist font-bold text-[clamp(1rem,3vw,1.5rem)] leading-[120%] tracking-[0%] text-[#424242] dark:text-white transition-colors duration-300">
                          {feature}
                        </h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Feature Right Image - Full height, fills top-right and bottom-right corners */}
                <div className="hidden lg:flex justify-end absolute top-0 right-0 h-full w-[359px] z-5">
                  <div className="relative w-full h-full rounded-tr-[12px] rounded-br-[12px] overflow-hidden">
                    {/* Feature Right Image - Full size 359px × 559px */}
                    <Image
                      src={images.featureStars}
                      alt="Premium Features"
                      width={359}
                      height={559}
                      className="w-full h-full object-cover relative z-20"
                    />
                  </div>
                </div>

                {/* Tablet Feature Right Image */}
                <div className="flex justify-center md:flex lg:hidden">
                  <div className="relative w-full aspect-[359/559] rounded-[12px] overflow-hidden">
                    <Image
                      src={images.featureStars}
                      alt="Premium Features"
                      width={0}
                      height={0}
                      sizes="(max-width: 1024px) 100vw, 359px"
                      className="w-full h-auto object-cover"
                      style={{ height: 'auto' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
