import Navbar from '@/components/layout/navbar';
import { Footer } from '@/components/layout/Footer';
import { GameHero } from '@/components/game-lobby/GameHero';
import { GameInfo } from '@/components/game-lobby/GameInfo';
import { GamePromo } from '@/components/game-lobby/GamePromo';
import { NonogramPuzzleGrid } from '@/components/game-lobby/NonogramPuzzleGrid';
import { GameLobbyProvider } from '@/contexts/GameLobbyContext';

export default async function NonogramLobbyPage() {
  return (
    <GameLobbyProvider>
      <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
        <Navbar />
        <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
          <main className="flex-grow flex flex-col">
            <GameHero
              name="Nonogram"
              image="/kakuro.svg"
              difficulties={['easy', 'medium', 'hard', 'expert']}
              gameSlug="nonogram"
            />
            <NonogramPuzzleGrid />
            <GameInfo
              name="Nonogram"
              about="Nonogram is a picture logic puzzle where you reveal a hidden image by filling in cells according to number clues. Each number indicates a consecutive group of filled cells in that row or column. Combine logical reasoning with artistic discovery as beautiful pixel art emerges from your deductions."
              howToPlay="Look at the numbers beside each row and above each column. These indicate groups of consecutive filled cells. Left-click to fill a cell black, right-click to mark it as definitely empty with an X. Start with rows and columns that have large numbers or limited possibilities. Cross-reference rows and columns to narrow down cell states. The puzzle is complete when a recognizable image appears and all clues are satisfied."
              bulletPoints={[
                'Each number represents a group of consecutive filled cells sequentially',
                'Multiple numbers mean multiple groups separated by empty cells throughout',
                'At least one empty cell must exist between groups',
              ]}
              keyboardControls="Left-click to fill cells. Right-click to mark cells as empty. Use ARROW KEYS to navigate. Press SPACE to toggle between fill and mark modes. Press U to undo."
              gameSlug="nonogram"
            />
            <GamePromo />
          </main>
        </div>
        <Footer />
      </div>
    </GameLobbyProvider>
  );
}
