/**
 * Chess AI Engine with Easy, Medium, and Hard difficulty levels
 * Uses Minimax evaluation with Piece-Square tables and Alpha-Beta pruning
 * Fast, responsive execution without mutating or polluting the live game engine instance
 */

import { Chess, Square, PieceType } from '@/lib/chess/chessEngine'

export type AiDifficulty = 'easy' | 'medium' | 'hard'

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

// Piece-Square positional evaluation tables
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0
]

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50
]

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20
]

const ROOK_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0
]

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20
]

function evaluateBoard(game: Chess): number {
  let totalScore = 0
  const board = game.board()

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c]
      if (!piece) continue

      let val = PIECE_VALUES[piece.type]
      const squareIndex = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c

      let pst = 0
      switch (piece.type) {
        case 'p': pst = PAWN_TABLE[squareIndex]; break
        case 'n': pst = KNIGHT_TABLE[squareIndex]; break
        case 'b': pst = BISHOP_TABLE[squareIndex]; break
        case 'r': pst = ROOK_TABLE[squareIndex]; break
        case 'q': pst = QUEEN_TABLE[squareIndex]; break
      }

      val += pst

      if (piece.color === 'w') {
        totalScore += val
      } else {
        totalScore -= val
      }
    }
  }

  return totalScore
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game)
  }

  const moves = game.moves({ verbose: true })

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of moves) {
      game.move({ from: move.from, to: move.to, promotion: move.promotion })
      const evalVal = minimax(game, depth - 1, alpha, beta, false)
      game.undo()
      maxEval = Math.max(maxEval, evalVal)
      alpha = Math.max(alpha, evalVal)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of moves) {
      game.move({ from: move.from, to: move.to, promotion: move.promotion })
      const evalVal = minimax(game, depth - 1, alpha, beta, true)
      game.undo()
      minEval = Math.min(minEval, evalVal)
      beta = Math.min(beta, evalVal)
      if (beta <= alpha) break
    }
    return minEval
  }
}

export async function getBestAiMove(
  game: Chess,
  difficulty: AiDifficulty
): Promise<{ from: Square; to: Square; promotion?: PieceType } | null> {
  try {
    // CRITICAL: Clone the engine instance so minimax calculations NEVER pollute or mutate live match state!
    const searchEngine = new Chess(game.fen())
    const moves = searchEngine.moves({ verbose: true })
    if (moves.length === 0) return null

    const aiColor = searchEngine.turn()
    const isMaximizing = aiColor === 'w'

    // Easy Difficulty: 30% random move, else fast depth 1 evaluation
    if (difficulty === 'easy') {
      if (Math.random() < 0.3) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)]
        return { from: randomMove.from, to: randomMove.to, promotion: randomMove.promotion ? (randomMove.promotion as PieceType) : undefined }
      }
    }

    const searchDepth = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1

    let bestMove = moves[0]
    let bestValue = isMaximizing ? -Infinity : Infinity

    // Shuffle moves slightly to avoid deterministic repetitive openings
    const shuffledMoves = [...moves].sort(() => Math.random() - 0.5)

    for (const move of shuffledMoves) {
      searchEngine.move({ from: move.from, to: move.to, promotion: move.promotion })
      const boardVal = minimax(searchEngine, searchDepth - 1, -Infinity, Infinity, !isMaximizing)
      searchEngine.undo()

      if (isMaximizing) {
        if (boardVal > bestValue) {
          bestValue = boardVal
          bestMove = move
        }
      } else {
        if (boardVal < bestValue) {
          bestValue = boardVal
          bestMove = move
        }
      }
    }

    return {
      from: bestMove.from,
      to: bestMove.to,
      promotion: bestMove.promotion ? (bestMove.promotion as PieceType) : undefined,
    }
  } catch (err) {
    console.error('[Chess AI] Search failed, returning random move:', err)
    const fallbackEngine = new Chess(game.fen())
    const fallbackMoves = fallbackEngine.moves({ verbose: true })
    if (fallbackMoves.length === 0) return null
    const randomMove = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)]
    return { from: randomMove.from, to: randomMove.to, promotion: randomMove.promotion ? (randomMove.promotion as PieceType) : undefined }
  }
}
