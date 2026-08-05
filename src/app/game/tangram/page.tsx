/**
 * Tangram Game Lobby Page
 * Entry point from homepage "Play Now" button
 */

import { Metadata } from 'next'
import { AppLayout } from '@/components/layout/AppLayout'
import { GameHero } from '@/components/game-lobby/GameHero'
import { GameInfo } from '@/components/game-lobby/GameInfo'
import { GamePromo } from '@/components/game-lobby/GamePromo'
import { GameLobbyProvider } from '@/contexts/GameLobbyContext'

export const metadata: Metadata = {
  title: 'Tangram Lobby',
}

export default function TangramLobbyPage() {
  return (
    <GameLobbyProvider>
      <AppLayout>
        <main className="flex-grow flex flex-col">
          <GameHero
            name="Tangram"
            image="/kakuro.svg"
            difficulties={['easy', 'medium', 'hard']}
            gameSlug="tangram"
          />
           <GameInfo
            name="Tangram"
            about="Tangram is an ancient Chinese dissection puzzle consisting of seven flat pieces called tans. The objective is to form a specific shape using all seven pieces without overlapping. This classic game enhances spatial awareness, problem-solving skills, and geometric understanding."
            howToPlay="Select a piece from the tray and drag it onto the board. Double-click the border of the orbital helper and drag to rotate the piece. Align all pieces with the target silhouette to solve the puzzle."
            bulletPoints={[
              'Use all seven tangram pieces',
              'Pieces cannot overlap',
              'All pieces must be used to form the target shape',
              'Rotate pieces to fit the pattern',
              'Complete the puzzle with precision',
            ]}
            keyboardControls="No keyboard controls needed. Use your mouse or touch screen to drag and rotate pieces."
            gameSlug="tangram"
          />
          <GamePromo />
        </main>
      </AppLayout>
    </GameLobbyProvider>
  )
}
