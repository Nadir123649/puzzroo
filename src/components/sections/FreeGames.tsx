'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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

const gamesData: GameCard[] = [
  {
    id: 'number-ninja',
    title: 'NUMBER NINJA',
    status: 'Unplayed',
    image: images.gameCards.numberNinja,
    imageLight: images.gameCards.numberNinjaWhite,
    imageAlt: 'Number Ninja Game',
  },
  {
    id: 'crossword',
    title: 'CROSS WORD',
    status: 'Unplayed',
    image: images.gameCards.crossWord,
    imageAlt: 'Cross Word Game',
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    status: 'Unplayed',
    image: images.gameCards.sudoku,
    imageAlt: 'Sudoku Game',
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
    id: 'nonogram',
    title: 'NONOGRAM',
    status: 'Unplayed',
    image: images.gameCards.nonogram,
    imageLight: images.gameCards.nonogramWhite,
    imageAlt: 'Nonogram Game',
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
  
  const currentImage = theme === 'light' && game.imageLight ? game.imageLight : game.image
  const displayStatus = isPlayed ? 'Played' : game.status
  
  return (
    <div className="flex flex-col bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[6px] md:rounded-[12.31px] p-[12px] md:p-[20px] lg:p-[30.78px] gap-[12px] md:gap-[20px] lg:gap-[30.78px] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 group md:min-h-auto">
      {/* Game Image - Fluid and responsive */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#F0EDFF] dark:bg-[#1F222A]">
        <Image
          src={currentImage}
          alt={game.imageAlt}
          width={0}
          height={0}
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
          <span className={`font-urbanist font-semibold text-[7px] md:text-[clamp(0.8rem,2.5vw,1.03rem)] leading-[140%] tracking-[0.21px] ${
            isPlayed ? 'text-[#22C55E]' : 'text-[#212121] dark:text-[#FAFAFA]'
          }`}>
            {displayStatus}
          </span>
        </div>

        {/* Play Now Button - with margin-top auto only on desktop to push to bottom */}
        <Link href={`/game/${game.id}`} className="w-full">
          <button className="w-full h-[18.65px] md:h-[38px] lg:h-[42px] flex items-center justify-center rounded-[2px] md:rounded-[4px] border-[0.86px] md:border-2 border-[#6949FF] bg-[#6949FF] hover:bg-[#5536E6] hover:border-[#5536E6] text-white font-urbanist font-semibold text-[7px] md:text-[clamp(0.875rem,2vw,1rem)] transition-all duration-200 active:scale-95 py-[4.32px] px-[17.3px] md:py-0 md:px-0 md:mt-auto" aria-label={`Play ${game.title}`}>
            {isPlayed ? 'Play Again' : 'Play Now'}
          </button>
        </Link>
      </div>
    </div>
  )
}

export default FreeGames
