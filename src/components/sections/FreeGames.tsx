'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { images } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'

interface GameCard {
  id: string 
  title: string
  status: string
  image: string
  imageLight?: string
  imageAlt: string
}

// Active games that are fully implemented
const ACTIVE_GAMES = ['sudoku', 'cross-math', 'nonogram', 'tangram', 'chess']

const gamesData: GameCard[] = [
  {
    id: 'sudoku',
    title: 'Sudoku',
    status: 'Unplayed',
    image: images.gameCards.sudoku,
    imageAlt: 'Sudoku Game',
  },
  {
    id: 'cross-math',
    title: 'CROSS MATH',
    status: 'Unplayed',
    image: images.gameCards.crossWord,
    imageAlt: 'Cross Math Game',
  },
  {
    id: 'nonogram',
    title: 'NONOGRAM',
    status: 'Unplayed',
    image: images.gameCards.nonogram,
    imageLight: images.gameCards.nonogramWhite,
    imageAlt: 'Nonogram Game',
  },
  {
    id: 'tangram',
    title: 'TANGRAM',
    status: 'Unplayed',
    image: images.gameCards.kakuro,
    imageAlt: 'Tangram Game',
  },
  {
    id: 'chess',
    title: 'CHESS',
    status: 'Unplayed',
    image: images.gameCards.dotsMatch,
    imageAlt: 'Chess Game',
  },
  {
    id: 'kakuro',
    title: 'KAKURO',
    status: 'Unplayed',
    image: images.gameCards.kakuro,
    imageAlt: 'Kakuro Game',
  },
  {
    id: 'dots-match',
    title: 'DOTS MATCH',
    status: 'Unplayed',
    image: images.gameCards.dotsMatch,
    imageAlt: 'Dots Match Game',
  },
  {
    id: 'number-ninja',
    title: 'NUMBER NINJA',
    status: 'Unplayed',
    image: images.gameCards.numberNinja,
    imageLight: images.gameCards.numberNinjaWhite,
    imageAlt: 'Number Ninja Game',
  },
]

// Helper functions for localStorage
const getPlayedGames = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const played = localStorage.getItem('puzzroo_played_games')
    return played ? new Set(JSON.parse(played)) : new Set()
  } catch {
    return new Set()
  }
}

export const markGameAsPlayed = (gameId: string): void => {
  if (typeof window === 'undefined') return
  try {
    const playedGames = getPlayedGames()
    playedGames.add(gameId)
    localStorage.setItem('puzzroo_played_games', JSON.stringify([...playedGames]))
  } catch (error) {
    console.error('Failed to mark game as played:', error)
  }
}

export function FreeGames() {
  const [playedGames, setPlayedGames] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load played games from localStorage
    setPlayedGames(getPlayedGames())
  }, [])

  return (
   <section
  id="free-games"
  className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-8 sm:py-10 md:py-8 lg:py-14 "
>
  <div className="w-full px-[20px]">
    <div className="flex flex-col gap-7">

      {/* Heading */}
      <div className="w-full flex items-center gap-2.5">
        <h2 className="font-urbanist font-bold text-[24px] md:text-[clamp(2rem,5vw,3rem)] leading-tight text-[#181A20] dark:text-white transition-colors duration-300">
          Free Games
        </h2>

        <Image
          src={images.starIcon}
          alt="Star Icon"
          width={24}
          height={24}
          className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 select-none flex-shrink-0"
        />
      </div>

      {/* Grid */}
      <div className="w-full">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7 lg:gap-[30px]">
          {gamesData.map((game) => (
            <GameCardComponent 
              key={game.id} 
              game={game} 
              isPlayed={playedGames.has(game.id)}
            />
          ))}
        </div>
      </div>

    </div>
  </div>
</section>
  )
}

interface GameCardComponentProps {
  game: GameCard
  isPlayed: boolean
}

function GameCardComponent({ game, isPlayed }: GameCardComponentProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const isActive = ACTIVE_GAMES.includes(game.id)
  
  const currentImage = theme === 'light' && game.imageLight ? game.imageLight : game.image
  const displayStatus = isPlayed ? 'Played' : game.status
  
  // Locked/Coming Soon state
  if (!isActive) {
    return (
      <div className="flex flex-col bg-[#F0EDFF] dark:bg-[#262A34] rounded-[6px] md:rounded-[12.31px] p-[12px] md:p-[16px] lg:p-[24px] gap-[12px] md:gap-[16px] lg:gap-[24px] opacity-60 cursor-not-allowed relative md:min-h-auto border-2 border-transparent dark:border-[#35383F]">
        {/* Overlay effect - NO BLUR */}
        <div className="absolute inset-0 bg-gray-500/10 dark:bg-black/20 rounded-[6px] md:rounded-[12.31px] z-10 flex items-center justify-center">
          <span className="font-urbanist font-bold text-[12px] md:text-[16px] lg:text-[18px] text-[#212121] dark:text-[#FAFAFA] bg-white/80 dark:bg-black/60 px-4 py-2 md:px-6 md:py-3 rounded-full">
            Coming Soon
          </span>
        </div>
        
        {/* Game Image - Grayscale (no blur) */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#F0EDFF] dark:bg-[#1F222A] grayscale">
          <Image
            src={currentImage}
            alt={game.imageAlt}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="w-full h-full object-cover select-none"
          />
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-[10px] md:gap-[15px] lg:gap-[20.52px] md:flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-urbanist font-bold text-[9px] md:text-[clamp(1rem,3vw,1.28rem)] leading-[120%] text-[#212121] dark:text-[#FAFAFA]">
              {game.title}
            </h3>
          </div>

          {/* Button Group - Disabled */}
          <div className="flex flex-col gap-[6px] md:gap-[10px]">
            {/* Daily Challenge Button - Disabled */}
            <button 
              disabled 
              className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-full border-[0.86px] md:border-2 border-[#BDBDBD] bg-[#E0E0E0] dark:bg-[#424242] dark:border-[#616161] text-[#757575] dark:text-[#9E9E9E] font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] cursor-not-allowed py-[4.32px] px-[17.3px] md:py-0 md:px-0"
            >
              Daily Challenge
            </button>

            {/* Play Now Button - Disabled */}
            <button 
              disabled 
              className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-full border-[0.86px] md:border-2 border-[#BDBDBD] bg-[#E0E0E0] dark:bg-[#424242] dark:border-[#616161] text-[#757575] dark:text-[#9E9E9E] font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] cursor-not-allowed py-[4.32px] px-[17.3px] md:py-0 md:px-0"
            >
              Play Now
            </button>

            {/* Past Puzzle Button - Disabled */}
            <button 
              disabled 
              className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-full border-[0.86px] md:border-2 border-[#BDBDBD] bg-white dark:bg-[#1F222A] dark:border-[#616161] text-[#757575] dark:text-[#9E9E9E] font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] cursor-not-allowed py-[4.32px] px-[17.3px] md:py-0 md:px-0"
            >
              Past Puzzle
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Active game card with 3 buttons
  return (
    <div 
      onClick={() => router.push(`/game/${game.id}`)}
      className="flex flex-col bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[6px] md:rounded-[12.31px] p-[12px] md:p-[16px] lg:p-[24px] gap-[12px] md:gap-[16px] lg:gap-[24px] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 group md:min-h-auto cursor-pointer"
    >
      {/* Game Image - Fluid and responsive */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#F0EDFF] dark:bg-[#1F222A]">
        <Image
          src={currentImage}
          alt={game.imageAlt}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="w-full h-full object-cover select-none"
        />
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-[10px] md:gap-[15px] lg:gap-[20.52px] md:flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-urbanist font-bold text-[9px] md:text-[clamp(1rem,3vw,1.28rem)] leading-[120%] text-[#212121] dark:text-[#FAFAFA]">
            {game.title}
          </h3>
          {isPlayed && (
            <span className="font-urbanist font-semibold text-[7px] md:text-[clamp(0.8rem,2.5vw,1.03rem)] leading-[140%] tracking-[0.21px] text-[#22C55E]">
              Recently Played
            </span>
          )}
        </div>

        {/* Button Group */}
        <div className="flex flex-col gap-[6px] md:gap-[10px]">
          {game.id === 'chess' ? (
            <Link href={`/game/${game.id}`} className="w-full" onClick={(e) => e.stopPropagation()}>
              <button className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-full border-[0.86px] md:border-2 border-[#6949FF] bg-[#6949FF] hover:bg-[#5536E6] hover:border-[#5536E6] text-white font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] transition-all duration-200 active:scale-95 py-[4.32px] px-[17.3px] md:py-0 md:px-0" aria-label={`Play ${game.title}`}>
                Play Chess
              </button>
            </Link>
          ) : (
            <>
              {/* Daily Challenge Button */}
              <Link href={`/daily-challenge/${game.id}`} className="w-full" onClick={(e) => e.stopPropagation()}>
                <button className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-full border-[0.86px] md:border-2 border-[#6949FF] bg-[#6949FF] hover:bg-[#5536E6] hover:border-[#5536E6] text-white font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] transition-all duration-200 active:scale-95 py-[4.32px] px-[17.3px] md:py-0 md:px-0" aria-label={`Daily Challenge for ${game.title}`}>
                  Daily Challenge
                </button>
              </Link>

              {/* Play Now Button */}
              <Link href={`/game/${game.id}`} className="w-full" onClick={(e) => e.stopPropagation()}>
                <button className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-full border-[0.86px] md:border-2 border-[#6949FF] bg-[#6949FF] hover:bg-[#5536E6] hover:border-[#5536E6] text-white font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] transition-all duration-200 active:scale-95 py-[4.32px] px-[17.3px] md:py-0 md:px-0" aria-label={`Play ${game.title}`}>
                  {isPlayed ? 'Play Again' : 'Play Now'}
                </button>
              </Link>

              {/* Past Puzzle Button */}
              <Link href={`/past-puzzles/${game.id}`} className="w-full group" onClick={(e) => e.stopPropagation()}>
                <button className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-full border-[0.86px] md:border-2 border-[#6949FF] bg-white dark:bg-[#1F222A] hover:bg-[#6949FF] dark:hover:bg-[#6949FF] text-[#6949FF] hover:text-white font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] transition-all duration-200 active:scale-95 py-[4.32px] px-[17.3px] md:py-0 md:px-0" aria-label={`Past Puzzles for ${game.title}`}>
                  Past Puzzle
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FreeGames
