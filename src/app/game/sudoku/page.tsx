import { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';
import { GameHero } from '@/components/game-lobby/GameHero';
import { GameInfo } from '@/components/game-lobby/GameInfo';
import { GamePromo } from '@/components/game-lobby/GamePromo';
import { GameLobbyProvider } from '@/contexts/GameLobbyContext';

export const metadata: Metadata = {
  title: 'Sudoku Lobby',
};

export default function SudokuLobbyPage() {
  return (
    <GameLobbyProvider>
      <AppLayout>
        <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
          <GameHero
            name="Sudoku"
            image="/soduko.svg"
            difficulties={['easy', 'medium', 'hard', 'expert']}
            gameSlug="sudoku"
          />
          <GameInfo
            name="Sudoku"
            about="Sudoku is the world's most popular logic-based number puzzle. Fill a 9×9 grid with digits so that each column, row, and 3×3 section contains the numbers 1-9 without repetition. No math required - just pure logical deduction and strategic thinking. Perfect for developing concentration and problem-solving skills."
            howToPlay="Click any empty cell to select it, then enter a number from 1-9. The game will highlight the selected cell's row, column, and 3×3 box to help you visualize constraints. Use the notes feature to mark potential candidates in each cell. As you progress, eliminate possibilities using logical deduction techniques like naked pairs, hidden singles, and box-line reduction. The puzzle is complete when all 81 cells are correctly filled. Invalid entries are automatically highlighted to help you catch mistakes."
            bulletPoints={[
              'Each row must contain all digits from one to nine',
              'Each column must contain all digits from one to nine',
              'Each three by three grid must contain digits one to nine'
            ]}
            keyboardControls="Type numbers 1-9 to fill cells. Press N to toggle notes mode. Use ARROW KEYS to navigate between cells. Press DELETE or BACKSPACE to clear a cell. Press U to undo your last move."
            gameSlug="sudoku"
          />
          <GamePromo />
        </div>
      </AppLayout>
    </GameLobbyProvider>
  );
}
