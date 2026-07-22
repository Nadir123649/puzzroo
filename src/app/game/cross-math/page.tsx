import Navbar from '@/components/layout/navbar';
import { Footer } from '@/components/layout/Footer';
import { GameHero } from '@/components/game-lobby/GameHero';
import { GameInfo } from '@/components/game-lobby/GameInfo';
import { GamePromo } from '@/components/game-lobby/GamePromo';
import { GameLobbyProvider } from '@/contexts/GameLobbyContext';

export default function CrossMathLobbyPage() {
  return (
    <GameLobbyProvider>
      <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
        <Navbar />
        <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
          <main className="flex-grow flex flex-col">
            <GameHero
              name="Cross Math"
              image="/kakuro.svg"
              difficulties={['easy', 'medium', 'hard']}
              gameSlug="cross-math"
            />
            <GameInfo
              name="Cross Math"
              about="Cross Math combines the challenge of mathematical equations with the logic of crossword-style puzzles. Fill in the missing numbers to complete equations that work both horizontally and vertically. Perfect for sharpening your arithmetic skills and logical thinking in an engaging puzzle format."
              howToPlay="Each puzzle contains a grid of equations. Some cells have numbers filled in already (clues), while others are blank for you to fill. Every equation must be mathematically correct using the numbers 1-9. Use logical deduction to determine which number belongs in each blank cell. Tap on a blank cell and select a number from the number pad. The puzzle is complete when all equations are satisfied."
              bulletPoints={[
                'Fill blank cells with numbers 1-9 to complete equations',
                'Each equation must be mathematically correct',
                'Use logical deduction - no guessing required',
              ]}
              keyboardControls="Tap a blank cell to select it. Use the number pad to enter your answer. Use the Undo button or press U to undo your last entry. Use the Eraser button to clear a cell."
              gameSlug="cross-math"
            />
            <GamePromo />
          </main>
        </div>
        <Footer />
      </div>
    </GameLobbyProvider>
  );
}
