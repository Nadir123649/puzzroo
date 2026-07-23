'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Calendar, Loader2, X, Check, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { generatePastPuzzles } from '@shared/lib/dailyChallenge/generator'
import { getChallengeStatus, getAccessiblePastChallenges } from '@shared/lib/dailyChallenge/storage'
import { DailyChallenge, DailyChallengeStatus } from '@shared/lib/dailyChallenge/types'
import { AccessModal } from './AccessModal'
import { FilterDropdown } from './FilterDropdown'
import { CalendarModal } from './CalendarModal'
import { images } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { getCompletedPuzzleIds } from '@shared/lib/completion/universal'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/Footer'
import { GameLoader } from '@/components/ui/GameLoader'
import { isLoggedIn, getCurrentUser } from '@/lib/auth/frontend-auth'

interface PastPuzzlesContentProps {
  gameId: 'sudoku' | 'cross-math' | 'nonogram' | 'tangram'
}

export function PastPuzzlesContent({ gameId }: PastPuzzlesContentProps) {
  const [puzzles, setPuzzles] = useState<DailyChallenge[]>([])
  
  // Persist filter + selected date in sessionStorage so navigation doesn't reset them
  const storageKey = `puzzroo_past_filter_${gameId}`
  const dateStorageKey = `puzzroo_past_date_${gameId}`

  const [filter, setFilter] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(storageKey)
      if (saved && ['all', 'not-started', 'in-progress', 'completed'].includes(saved)) {
        return saved as 'all' | 'not-started' | 'in-progress' | 'completed'
      }
    }
    return 'all'
  })
  
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(dateStorageKey) || null
    }
    return null
  })
  
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [completedPuzzles, setCompletedPuzzles] = useState<Set<string>>(new Set())
  const [authed, setAuthed] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8
  const accessibleCount = getAccessiblePastChallenges(authed)
  const { theme } = useTheme()
  const [userLoggedIn, setUserLoggedIn] = useState(false)

  useEffect(() => {
    setUserLoggedIn(isLoggedIn())
  }, [])

  useEffect(() => {
    setAuthed(isLoggedIn())
  }, [])

  // Persist filter changes to sessionStorage
  const handleFilterChange = (newFilter: 'all' | 'not-started' | 'in-progress' | 'completed') => {
    setFilter(newFilter)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, newFilter)
    }
  }

  // Format game title
  const gameTitle = gameId === 'cross-math' ? 'CrossMath' : gameId === 'sudoku' ? 'Sudoku' : gameId === 'nonogram' ? 'Nonogram' : gameId === 'tangram' ? 'Tangram' : gameId

  // Get game icon - theme aware for nonogram
  const gameIcon = gameId === 'cross-math' 
    ? images.gameCards.crossWord 
    : gameId === 'sudoku' 
      ? images.gameCards.sudoku 
      : gameId === 'nonogram' 
        ? (theme === 'light' ? images.gameCards.nonogramWhite : images.gameCards.nonogram)
        : images.gameCards.sudoku

  // Lock body scroll when loading
  useEffect(() => {
    if (isLoading) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isLoading])

  // Save current URL for returning from daily challenge
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('puzzroo_return_url', `/past-puzzles/${gameId}`)
    }
  }, [gameId])

  // Load completed puzzles from universal completion system
  useEffect(() => {
    const gameType = gameId === 'cross-math' ? 'crossmath' : gameId === 'sudoku' ? 'sudoku' : gameId === 'nonogram' ? 'nonogram' : 'tangram'
    setCompletedPuzzles(getCompletedPuzzleIds(gameType))
  }, [gameId])

  useEffect(() => {
    // Generate past puzzles anchored to account creation (min 3)
    const user = getCurrentUser()
    const accountCreatedAt = user?.createdAt ? new Date(user.createdAt) : undefined
    const generated = generatePastPuzzles(24, gameId, accountCreatedAt)
    
    // Update status from localStorage and apply lock
    const withStatus = generated.map((puzzle, index) => {
      if (authed) {
        return {
          ...puzzle,
          status: getChallengeStatus(puzzle.id),
        }
      }
      if (index >= accessibleCount) {
        return { ...puzzle, status: 'locked' as DailyChallengeStatus }
      }
      return {
        ...puzzle,
        status: getChallengeStatus(puzzle.id),
      }
    })
    
    setPuzzles(withStatus)
  }, [gameId, accessibleCount, authed])

  // Filter puzzles
  const filteredPuzzles = puzzles.filter(p => {
    // If a date is selected, only show puzzles matching that date (including locked)
    if (selectedDate) {
      return p.dateString === selectedDate
    }
    
    // Check if puzzle is completed from universal system
    const isCompleted = completedPuzzles.has(p.id)
    
    // If filter is 'all', show everything
    if (filter === 'all') return true
    
    // If filter is 'completed', show only completed puzzles
    if (filter === 'completed') {
      return isCompleted && p.status !== 'locked'
    }
    
    // If filter is 'not-started', show not-started AND locked puzzles (but NOT completed)
    if (filter === 'not-started') {
      return (p.status === 'not-started' || p.status === 'locked') && !isCompleted
    }
    
    // If filter is 'in-progress', show in-progress (but NOT completed)
    if (filter === 'in-progress') {
      return p.status === 'in-progress' && !isCompleted
    }
    
    // Otherwise, match the exact status
    return p.status === filter
  })

  const totalPages = Math.max(1, Math.ceil(filteredPuzzles.length / ITEMS_PER_PAGE))
  
  // Adjust currentPage if it exceeds totalPages due to filtering
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredPuzzles.length, totalPages, currentPage])

  // Reset to first page when filter or selectedDate changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, selectedDate])

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedPuzzles = filteredPuzzles.slice(startIndex, endIndex)

  const handleDateSelected = (dateString: string) => {
    setSelectedDate(dateString)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(dateStorageKey, dateString)
    }
    setShowCalendarModal(false)
  }

  const clearDateFilter = () => {
    setSelectedDate(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(dateStorageKey)
    }
  }

  return (
    <>
      <Navbar />
      <section className="w-full min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 pt-4 pb-0 md:pb-10">
        <div className="w-full px-[20px] max-w-[1380px] mx-auto">
          
          {/* Back Arrow */}
          <Link href="/" className="hidden md:inline-block">
            <button
              className="w-11 h-11 rounded-full border-2 border-[var(--color-primary)] bg-white dark:bg-[#181A20] flex items-center justify-center hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95"
              aria-label="Back to home"
            >
              <ArrowLeft size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
            </button>
          </Link>

          {/* Main Container with Border */}
          <div className="border-[0.95px] border-[#979797] dark:border-[#E0E0E0] rounded-3xl pt-4 pb-4 pl-3 pr-3 md:p-6 md:pb-6 md:mt-5">
            <div className="flex flex-col gap-6">

              {/* Filter + Controls Container */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center flex-wrap px-0">
                <div className="w-full md:w-auto">
                  <FilterDropdown value={filter} onChange={handleFilterChange} />
                </div>
                
                <button 
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 h-[46px] md:h-auto md:py-2 rounded-lg bg-white dark:bg-[#1F222A] border-[1px] border-[#6949FF] text-[#6949FF] font-urbanist font-medium text-[14px] hover:bg-[#F0EDFF] dark:hover:bg-[#2D2640] transition-all"
                  onClick={() => setShowCalendarModal(true)}
                >
                  <Calendar size={18} />
                  <span>Select Date</span>
                </button>

                {/* Clear Date Filter Button (if date selected) */}
                {selectedDate && (
                  <button 
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 h-[46px] md:h-auto md:py-2 rounded-lg bg-[#6949FF] text-white font-urbanist font-medium text-[14px] hover:bg-[#5536E6] transition-all"
                    onClick={clearDateFilter}
                  >
                    <X size={18} />
                    <span>Clear Date ({selectedDate})</span>
                  </button>
                )}
              </div>

              {/* Access Info Modal - only for guests */}
              {!authed && (
                <div className="bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1">
                    <p className="font-urbanist text-[14px] md:text-[16px] text-[#424242] dark:text-[#E0E0E0] leading-relaxed">
                      <span className="font-bold text-[#6949FF]">Guest Access:</span> You can play the last 3 days of daily challenges
                    </p>
                    <p className="font-urbanist text-[14px] md:text-[16px] text-[#424242] dark:text-[#E0E0E0] leading-relaxed">
                      Register to unlock 7 days of daily challenges!
                    </p>
                  </div>
                  
                  <Link href="/signup">
                    <button 
                      className="px-6 py-2 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[14px] md:text-[16px] transition-all duration-200 active:scale-95 whitespace-nowrap"
                    >
                      Register Now
                    </button>
                  </Link>
                </div>
              )}

              {/* Past Puzzle Grid - 1 column mobile, 4 columns desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-7 lg:gap-[30px] pt-4 pb-0 md:px-0 md:py-0">
                {paginatedPuzzles.map((puzzle) => (
                  <PuzzleCard
                    key={puzzle.id}
                    puzzle={puzzle}
                    gameIcon={gameIcon}
                    isLocked={puzzle.status === 'locked'}
                    isCompleted={completedPuzzles.has(puzzle.id)}
                    onLockedClick={() => setShowAccessModal(true)}
                    onPlayClick={setIsLoading}
                  />
                ))}
              </div>

              {/* Empty State */}
              {filteredPuzzles.length === 0 && (
                <div className="text-center py-16">
                  <p className="font-urbanist text-[16px] text-[#757575] dark:text-[#BDBDBD]">
                    No puzzles match this filter
                  </p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-6 mt-6 md:mt-8">
                  {/* Left Arrow Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-11 h-11 rounded-full border-2 border-[#6949FF] dark:border-[#6949FF] bg-white dark:bg-[#1F222A] flex items-center justify-center text-[#6949FF] hover:bg-[#F0EDFF] dark:hover:bg-[#2D2640] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#1F222A] disabled:border-[#BDBDBD] dark:disabled:border-[#616161] disabled:text-[#757575] dark:disabled:text-[#9E9E9E]"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={24} strokeWidth={2.5} />
                  </button>

                  {/* Page Indicator */}
                  <span className="font-urbanist font-bold text-[16px] text-[#212121] dark:text-[#FAFAFA]">
                    Page {currentPage} of {totalPages}
                  </span>

                  {/* Right Arrow Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="w-11 h-11 rounded-full border-2 border-[#6949FF] dark:border-[#6949FF] bg-white dark:bg-[#1F222A] flex items-center justify-center text-[#6949FF] hover:bg-[#F0EDFF] dark:hover:bg-[#2D2640] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#1F222A] disabled:border-[#BDBDBD] dark:disabled:border-[#616161] disabled:text-[#757575] dark:disabled:text-[#9E9E9E]"
                    aria-label="Next Page"
                  >
                    <ChevronRight size={24} strokeWidth={2.5} />
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>
      <Footer />

      {/* Lock Click Modal */}
      <AccessModal 
        isOpen={showAccessModal} 
        onClose={() => setShowAccessModal(false)}
        gameIcon={gameIcon}
      />

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        gameId={gameId}
        onDateSelected={handleDateSelected}
        initialSelectedDate={selectedDate}
      />

      {/* Loading Overlay */}
      <GameLoader isOpen={isLoading} text="Loading game..." />
    </>
  )
}

interface PuzzleCardProps {
  puzzle: DailyChallenge
  gameIcon: string
  isLocked: boolean
  isCompleted: boolean
  onLockedClick: () => void
  onPlayClick: (loading: boolean) => void
}

function PuzzleCard({ puzzle, gameIcon, isLocked, isCompleted, onLockedClick, onPlayClick }: PuzzleCardProps) {
  const router = useRouter()
  
  // Determine actual status - completed overrides other statuses
  const actualStatus = isCompleted && !isLocked ? 'completed' : puzzle.status
  
  const statusColors = {
    'completed': 'text-[#22C55E]',
    'in-progress': 'text-[#FF9800]',
    'not-started': 'text-[#757575] dark:text-[#BDBDBD]',
    'locked': 'text-[#BDBDBD] dark:text-[#757575]',
  }

  const statusLabels = {
    'completed': 'Completed',
    'in-progress': 'In Progress',
    'not-started': 'Not Started',
    'locked': 'Locked',
  }

  if (isLocked) {
    return (
      <div 
        onClick={onLockedClick}
        className="relative bg-white dark:bg-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] rounded-2xl p-5 flex flex-col gap-4 cursor-pointer hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 opacity-60"
      >
        {/* Lock Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-white dark:bg-[#1F222A] rounded-full p-4 shadow-lg">
            <Lock size={32} className="text-[#6949FF]" />
          </div>
        </div>

        {/* Content (visible but dimmed) - SAME STRUCTURE AS UNLOCKED */}
        <div className="relative z-0 opacity-40">
          {/* Top Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl flex items-center justify-center">
              <Image
                src={gameIcon}
                alt="Game Icon"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
          </div>

          {/* Date Badge */}
          <div className="bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl px-3 py-2 text-center mt-4">
            <p className="font-urbanist font-bold text-[11px] md:text-[12px] text-[#424242] dark:text-[#E0E0E0]">
              {puzzle.dateString}
            </p>
            <p className="font-urbanist font-bold text-[10px] md:text-[11px] text-[#757575] dark:text-[#BDBDBD]">
              {puzzle.dayName}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-[11px] md:text-[12px] flex-1 mt-4">
            <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0] dark:border-[#35383F]">
              <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Difficulty</span>
              <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0] capitalize">
                {puzzle.difficulty}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0] dark:border-[#35383F]">
              <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Shape</span>
              <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0] capitalize">
                {puzzle.shape}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Status</span>
              <span className={`font-urbanist font-bold text-[11px] md:text-[12px] ${statusColors[puzzle.status]}`}>
                {statusLabels[puzzle.status]}
              </span>
            </div>
          </div>

          {/* Play Button - SAME AS UNLOCKED */}
          <button
            className="w-full h-[46px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-semibold text-[14px] md:text-[16px] transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            <span>Play Puzzle</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transform group-hover:translate-x-1 transition-transform">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const handleCardClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isCompleted) return
    onPlayClick(true)
    // Show loading for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Route directly to game page with date in URL
    const gameUrl = puzzle.gameId === 'sudoku' 
      ? `/sudoku?date=${puzzle.dateString}` 
      : puzzle.gameId === 'cross-math' 
        ? `/cross-math?date=${puzzle.dateString}` 
        : puzzle.gameId === 'nonogram' 
          ? `/nonogram?date=${puzzle.dateString}&skipSelection=true` 
          : puzzle.gameId === 'tangram'
            ? `/tangram?date=${puzzle.dateString}`
            : '/sudoku'
    router.push(gameUrl)
  }

  return (
    <div 
      onClick={handleCardClick}
      className={`relative bg-white dark:bg-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] rounded-2xl p-4 md:p-5 flex flex-col gap-2.5 md:gap-4 hover:border-[#6949FF] transition-all duration-300 group ${!isCompleted ? 'cursor-pointer' : ''}`}
    >
      {/* Completion Badge */}
      {isCompleted && !isLocked && (
        <div className="absolute top-3 right-3 bg-[#22C55E] text-white rounded-full p-1.5 shadow-lg z-10">
          <Check size={16} strokeWidth={3} />
        </div>
      )}
      
      {/* Top Icon */}
      <div className="flex justify-center">
        <div className="w-14 h-14 md:w-20 md:h-20 bg-[#F0EDFF] dark:bg-[#35383F] rounded-lg md:rounded-xl flex items-center justify-center group-hover:shadow-md group-hover:shadow-purple-500/20 transition-shadow duration-300">
          <Image
            src={gameIcon}
            alt="Game Icon"
            width={28}
            height={28}
            className="object-contain w-7 h-7 md:w-10 md:h-10"
          />
        </div>
      </div>

      {/* Date Badge */}
      <div className="bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl px-3 py-2 text-center transition-colors duration-300">
        <p className="font-urbanist font-bold text-[11px] md:text-[12px] text-[#424242] dark:text-[#E0E0E0]">
          {puzzle.dateString}
        </p>
        <p className="font-urbanist font-bold text-[10px] md:text-[11px] text-[#757575] dark:text-[#BDBDBD]">
          {puzzle.dayName}
        </p>
      </div>

      {/* Details */}
      <div className="space-y-2 text-[11px] md:text-[12px] flex-1">
        <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0] dark:border-[#35383F]">
          <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Difficulty</span>
          <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0] capitalize">
            {puzzle.difficulty}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0] dark:border-[#35383F]">
          <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Shape</span>
          <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0] capitalize">
            {puzzle.shape}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Status</span>
          <span className={`font-urbanist font-bold text-[11px] md:text-[12px] ${statusColors[actualStatus]}`}>
            {statusLabels[actualStatus]}
          </span>
        </div>
      </div>

      {/* Play Button - CTA Style like Signup */}
      {isCompleted ? (
        <button
          disabled
          className="w-full h-[37px] md:h-[46px] rounded-full bg-[#EEEEEE] dark:bg-[#35383F] text-[#757575] dark:text-[#9E9E9E] font-urbanist font-bold text-[14px] md:text-[16px] flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <span>Completed</span>
          <Check size={16} className="text-[#22C55E]" strokeWidth={3} />
        </button>
      ) : (
        <button
          onClick={handleCardClick}
          className="w-full h-[37px] md:h-[46px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-semibold text-[14px] md:text-[16px] transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <span>Play Puzzle</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transform group-hover:translate-x-1 transition-transform">
            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
