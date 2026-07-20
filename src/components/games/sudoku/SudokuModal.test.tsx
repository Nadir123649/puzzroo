import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast } from 'react-hot-toast'
import { render } from '@testing-library/react'
import { SudokuModal } from '@/components/games/sudoku/SudokuModal'
import { ToastMessages } from '@/lib/toast'

function renderModal(props: Partial<React.ComponentProps<typeof SudokuModal>>) {
  return render(
    <SudokuModal
      isOpen
      type="win"
      time={120}
      mistakes={0}
      maxMistakes={3}
      score={500}
      onPlayAgain={() => {}}
      onNewGame={() => {}}
      onBackToGames={() => {}}
      {...props}
    />
  )
}

describe('SudokuModal win toast', () => {
  beforeEach(() => {
    vi.spyOn(toast, 'success')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fires a solved toast when the win modal opens', () => {
    renderModal({ type: 'win' })
    expect(toast.success).toHaveBeenCalledWith(
      ToastMessages.GAME_SOLVED,
      expect.anything()
    )
  })

  it('does not fire a solved toast for the game-over modal', () => {
    renderModal({ type: 'gameOver', mistakes: 3, score: 100 })
    expect(toast.success).not.toHaveBeenCalledWith(
      ToastMessages.GAME_SOLVED,
      expect.anything()
    )
  })
})
