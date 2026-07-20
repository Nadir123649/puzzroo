'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { generateDailyChallenge } from '@shared/lib/dailyChallenge/generator'

interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: 'sudoku' | 'cross-math' | 'nonogram' | 'tangram'
  onDateSelected?: (dateString: string) => void
  initialSelectedDate?: string | null
}

export function CalendarModal({ isOpen, onClose, gameId, onDateSelected, initialSelectedDate }: CalendarModalProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  
  // Keyboard navigation, mouse wheel / touchpad, and mobile swipe handlers
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Reset state when modal opens - restore previously selected date if available
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('')
      if (initialSelectedDate) {
        // Parse the stored dateString (MM-DD-YY) back into a Date
        const [month, day, year] = initialSelectedDate.split('-')
        const fullYear = 2000 + parseInt(year)
        const restoredDate = new Date(fullYear, parseInt(month) - 1, parseInt(day))
        restoredDate.setHours(0, 0, 0, 0)
        setSelectedDate(restoredDate)
        // Navigate calendar to that month
        setCurrentDate(new Date(fullYear, parseInt(month) - 1, 1))
      } else {
        setCurrentDate(new Date())
        setSelectedDate(null)
      }
    }
  }, [isOpen, initialSelectedDate])

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

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setErrorMessage('')
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setErrorMessage('')
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevMonth()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextMonth()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, currentDate])

  if (!isOpen) return null

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Generate calendar days
  const calendarDays: (number | null)[] = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  
  // Add actual days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Always pad to exactly 42 cells (6 rows of 7 days) to maintain stable card height
  while (calendarDays.length < 42) {
    calendarDays.push(null)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 20) {
      if (e.deltaX > 20) {
        handleNextMonth()
      } else {
        handlePrevMonth()
      }
    } else if (Math.abs(e.deltaY) > 20) {
      if (e.deltaY > 20) {
        handleNextMonth()
      } else {
        handlePrevMonth()
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return

    const deltaX = e.touches[0].clientX - touchStartRef.current.x
    const deltaY = e.touches[0].clientY - touchStartRef.current.y

    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
      if (deltaX > 50) {
        handlePrevMonth()
      } else {
        handleNextMonth()
      }
      touchStartRef.current = null
    }
  }

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day)
    clickedDate.setHours(0, 0, 0, 0)
    
    // Check if date is in the future
    if (clickedDate > today) {
      setErrorMessage('No puzzle available for future dates')
      setSelectedDate(null)
      return
    }

    // Format date string
    const dateString = `${String(clickedDate.getMonth() + 1).padStart(2, '0')}-${String(clickedDate.getDate()).padStart(2, '0')}-${String(clickedDate.getFullYear()).slice(-2)}`
    
    // If onDateSelected callback is provided, use it (for past puzzles page)
    if (onDateSelected) {
      setSelectedDate(clickedDate)
      setErrorMessage('')
      onDateSelected(dateString)
      return
    }

    // Otherwise, navigate to daily challenge (original behavior)
    try {
      const puzzle = generateDailyChallenge(clickedDate, gameId)
      if (puzzle) {
        setSelectedDate(clickedDate)
        setErrorMessage('')
        router.push(`/daily-challenge/${gameId}?date=${dateString}`)
        onClose()
      }
    } catch (error) {
      setErrorMessage('No puzzle available for this date')
      setSelectedDate(null)
    }
  }

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    )
  }

  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  const isFutureDate = (day: number) => {
    const checkDate = new Date(year, month, day)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate > today
  }

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[99999]"
        onClick={onClose}
        onDoubleClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto overscroll-contain no-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div 
          className="bg-white dark:bg-[#1F222A] rounded-2xl shadow-2xl max-w-md w-full p-6 relative my-auto scroll-smooth"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#757575] dark:text-[#BDBDBD] hover:text-[#212121] dark:hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="font-urbanist font-bold text-[24px] text-[#212121] dark:text-white mb-1">
            Select a Date
          </h2>
          <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD]">
            Choose a date to play that day's puzzle
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-colors"
          >
            <ChevronLeft size={20} className="text-[#212121] dark:text-white" />
          </button>

          <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white">
            {monthNames[month]} {year}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-colors"
          >
            <ChevronRight size={20} className="text-[#212121] dark:text-white" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center font-urbanist font-semibold text-[12px] text-[#757575] dark:text-[#BDBDBD] py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} />
            }

            const isDisabled = isFutureDate(day)
            const isSelectedDate = isDateSelected(day)
            const isTodayDate = isToday(day)

            return (
              <button
                key={day}
                onClick={() => !isDisabled && handleDateClick(day)}
                disabled={isDisabled}
                className={`
                  aspect-square rounded-lg font-urbanist font-medium text-[14px] transition-all
                  ${isDisabled 
                    ? 'text-[#BDBDBD] dark:text-[#616161] cursor-not-allowed' 
                    : 'text-[#212121] dark:text-white hover:bg-[#E8DFFF] dark:hover:bg-[#2D2640] cursor-pointer'
                  }
                  ${isSelectedDate 
                    ? 'bg-[#6949FF] text-white hover:bg-[#5536E6]' 
                    : ''
                  }
                  ${isTodayDate && !isSelectedDate 
                    ? 'border-2 border-[#6949FF]' 
                    : ''
                  }
                `}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="font-urbanist text-[14px] text-red-600 dark:text-red-400 text-center">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-[#E0E0E0] dark:border-[#424242]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg border-2 border-[#6949FF]"></div>
            <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#BDBDBD]">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#6949FF]"></div>
            <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#BDBDBD]">Selected</span>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
