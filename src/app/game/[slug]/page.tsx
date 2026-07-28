import { notFound } from 'next/navigation'
import { getGameBySlug, games } from '@/data/games'
import { AppLayout } from '@/components/layout/AppLayout'
import { GameHero } from '@/components/game-lobby/GameHero'
import { GameInfo } from '@/components/game-lobby/GameInfo'
import { GamePromo } from '@/components/game-lobby/GamePromo'
import { GameLobbyProvider } from '@/contexts/GameLobbyContext'

export async function generateStaticParams() {
  return games
    .filter((game) => game.slug !== 'tangram')
    .map((game) => ({
      slug: game.slug,
    }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === 'tangram') {
    return {
      title: 'Game Not Found | Puzzroo',
    }
  }
  const game = getGameBySlug(slug)
  
  if (!game) {
    return {
      title: 'Game Not Found | Puzzroo',
    }
  }

  return {
    title: `${game.name} - Play Free Online | Puzzroo`,
    description: game.about,
  }
}

export default async function GameLobbyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === 'tangram') {
    notFound()
  }
  const game = getGameBySlug(slug)

  if (!game) {
    notFound()
  }

  return (
    <GameLobbyProvider>
      <AppLayout>
        <main className="flex-grow flex flex-col">
          <GameHero
            name={game.name}
            image={game.image}
            imageLight={game.imageLight}
            difficulties={game.difficulty}
            gameSlug={game.slug}
          />
          <GameInfo
            name={game.name}
            about={game.about}
            howToPlay={game.howToPlay}
            bulletPoints={game.bulletPoints}
            keyboardControls={game.keyboardControls}
            gameSlug={game.slug}
          />
          <GamePromo />
        </main>
      </AppLayout>
    </GameLobbyProvider>
  )
}
