'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { images } from '@/lib/utils'

// Leaderboard data
const leaderboardData = [
  { name: 'Ahmed Khan', score: '4,850' },
  { name: 'Sarah Malik', score: '4,620' },
  { name: 'Ali Hassan', score: '4,430' },
  { name: 'Fatima Noor', score: '4,280' },
  { name: 'Omar Rashid', score: '4,150' },
  { name: 'Zara Ahmed', score: '4,020' },
  { name: 'Hassan Ali', score: '3,940' },
  { name: 'Aisha Khan', score: '3,810' },
]

export function EarlyLegends() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [cardsPerRow, setCardsPerRow] = useState(3)
  const sliderRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCardsPerRow(2)
      } else {
        setCardsPerRow(3)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Auto-slide every 3 seconds
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Handle infinite loop reset
  useEffect(() => {
    // When we reach the end of the first data set, instantly reset to beginning
    if (currentIndex === leaderboardData.length) {
      setTimeout(() => {
        setIsTransitioning(false)
        setCurrentIndex(0)
      }, 700) // Wait for transition to complete
    }
  }, [currentIndex])

  // Triple the data for infinite loop effect
  const extendedData = [...leaderboardData, ...leaderboardData, ...leaderboardData]

  // Calculate the slide offset
  const getTranslateX = () => {
    if (!containerRef.current) return '0px'
    
    const containerWidth = containerRef.current.offsetWidth
    const gap = cardsPerRow === 2 ? 12 : 20 // Fixed gap between cards
    const cardWidth = (containerWidth - gap * (cardsPerRow - 1)) / cardsPerRow // Width of one card
    
    return `-${currentIndex * (cardWidth + gap)}px`
  }

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-8 md:py-14">
      <div className="w-full max-w-[1380px] mx-auto px-[20px]">
        <div className="flex flex-col gap-7">
          
          {/* Heading */}
          <h2 className="font-urbanist font-bold text-[24px] md:text-[clamp(2rem,5vw,3rem)] leading-tight text-[#181A20] dark:text-white transition-colors duration-300">
            Early Legends
          </h2>

          {/* Leaderboard Slider Container */}
          <div ref={containerRef} className="overflow-hidden">
            <div
              ref={sliderRef}
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(${getTranslateX()})`,
                transition: isTransitioning ? 'transform 700ms ease-in-out' : 'none'
              }}
            >
              {extendedData.map((player, index) => {
                const originalIndex = index % leaderboardData.length
                const gap = cardsPerRow === 2 ? 12 : 20
                
                return (
                  <div
                    key={`card-${index}`}
                    className="flex-shrink-0"
                    style={{
                      width: cardsPerRow === 2 ? 'calc((100% - 12px) / 2)' : 'calc((100% - 40px) / 3)',
                      marginRight: index === extendedData.length - 1 ? '0' : `${gap}px`
                    }}
                  >
                    <div className="relative bg-[#F0EDFF] dark:bg-[#1F222A] border-2 border-[#E8E8E8] dark:border-[#35383F] rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-300 hover:border-[#6949FF] hover:shadow-lg h-full">
                      {/* Star Icon - Top Left Corner */}
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 w-5 h-5 md:w-7 md:h-7 z-10">
                        <Image
                          src={images.starIcon}
                          alt="Star"
                          width={28}
                          height={28}
                          className="w-full h-full select-none"
                        />
                      </div>

                      {/* Rank Number - Top Right Corner (aligned with Star Icon) */}
                      <div className="absolute top-1.5 right-2 md:top-2 md:right-3 z-10">
                        <span className="font-urbanist font-bold text-[16px] md:text-[24px] text-[#6949FF] leading-none">
                          #{originalIndex + 1}
                        </span>
                      </div>
                      
                      {/* Player Name */}
                      <div className="mb-1.5 md:mb-2 mt-4 md:mt-6">
                        <h3 className="font-urbanist font-bold text-[14px] md:text-[18px] lg:text-[20px] text-[#181A20] dark:text-white truncate">
                          {player.name}
                        </h3>
                      </div>

                      {/* Score */}
                      <div className="flex items-baseline gap-1 md:gap-1.5">
                        <span className="font-urbanist font-bold text-[18px] md:text-[24px] lg:text-[28px] text-[#6949FF]">
                          {player.score}
                        </span>
                        <span className="font-urbanist font-medium text-[12px] md:text-[14px] lg:text-[16px] text-[#757575] dark:text-[#BDBDBD]">
                          pts
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Statistics */}
          <div className="text-center">
            <p className="font-urbanist font-medium text-[14px] md:text-[16px] text-[#424242] dark:text-[#E0E0E0] transition-colors duration-300">
              <span className="font-bold text-[#6949FF]">15,000+</span> players completed puzzles in the last 30 days
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
