export type PieceColor = 'white' | 'black'

export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'

export interface ChessPieceData {
  id?: string
  type: PieceType
  color: PieceColor
}

/**
 * Centralized asset registry for all 12 SVG chess pieces.
 * Located in public/chess/pieces/classic/
 */
export const CHESS_PIECE_ASSETS: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    pawn: '/chess/pieces/classic/white-pawn.svg',
    knight: '/chess/pieces/classic/white-knight.svg',
    bishop: '/chess/pieces/classic/white-bishop.svg',
    rook: '/chess/pieces/classic/white-rook.svg',
    queen: '/chess/pieces/classic/white-queen.svg',
    king: '/chess/pieces/classic/white-king.svg',
  },
  black: {
    pawn: '/chess/pieces/classic/black-pawn.svg',
    knight: '/chess/pieces/classic/black-knight.svg',
    bishop: '/chess/pieces/classic/black-bishop.svg',
    rook: '/chess/pieces/classic/black-rook.svg',
    queen: '/chess/pieces/classic/black-queen.svg',
    king: '/chess/pieces/classic/black-king.svg',
  },
}

/**
 * Get SVG asset path for a specific piece color and type
 */
export function getPieceAsset(color: PieceColor, type: PieceType): string {
  return CHESS_PIECE_ASSETS[color]?.[type] || ''
}
