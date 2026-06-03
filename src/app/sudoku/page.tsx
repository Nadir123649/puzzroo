import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { SudokuHero } from '@/components/sudoku/SudokuHero'
import { SudokuGame } from '@/components/sudoku/SudokuGame'

export const metadata = {
  title: 'Sudoku - Play Free Online | Puzzroo',
  description: 'Play Sudoku for free on Puzzroo. Challenge yourself with this classic number puzzle game.',
}

export default function SudokuPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <SudokuHero />
          <SudokuGame />
        </main>
      </div>
      <Footer />
    </div>
  )
}
