'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { isLoggedIn } from '@/lib/auth/frontend-auth'

// Countdown Timer Hook
function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      
      const diff = midnight.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)
    
    return () => clearInterval(interval)
  }, [])

  return timeLeft
}

// Format current date
function useCurrentDate() {
  const [dateString, setDateString] = useState('')

  useEffect(() => {
    const now = new Date()
    const day = now.getDate()
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const month = months[now.getMonth()]
    const year = now.getFullYear()
    
    setDateString(`${day} ${month} ${year}`)
  }, [])

  return dateString
}

export function GamePromo() {
  const timeLeft = useCountdownToMidnight()
  const currentDate = useCurrentDate()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setAuthed(isLoggedIn())
  }, [])

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-8 md:pt-8">
      <div className="w-full px-[20px]">
        <div className="flex flex-col items-center gap-4 max-w-[382px] mx-auto">
          
          {/* Promotional Text - only for guests */}
          {!authed && (
            <p className="font-urbanist font-medium text-[14px] text-center text-[#424242] dark:text-[#E0E0E0]">
              Want to access more games or features?
            </p>
          )}

          {/* Subscribe Button - only for guests */}
          {!authed && (
            <Link href="/signup" className="w-full">
              <button className="w-full h-[46px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95">
                Subscribe
              </button>
            </Link>
          )}

          {/* Log In Button - only for guests */}
          {!authed && (
            <Link href="/login" className="w-full">
              <button className="w-full h-[46px] rounded-full border-2 border-[#6949FF] bg-white dark:bg-[#1F222A] hover:bg-[#6949FF] dark:hover:bg-[#6949FF] hover:text-white text-[#6949FF] font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95">
                Log In
              </button>
            </Link>
          )}

          {/* Date and Countdown */}
          <div className="w-full flex flex-col gap-2 p-4 md:mt-7 bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F]">
            <p className="font-urbanist font-semibold text-[14px] text-center text-[#424242] dark:text-[#E0E0E0]">
              {currentDate}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD]">⏱</span>
              <span className="font-urbanist font-bold text-[13px] text-[#6949FF]">
                Next challenge in: {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
