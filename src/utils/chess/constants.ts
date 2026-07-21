import { ChessPieceData } from './pieceAssets'

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

export type FileSymbol = (typeof FILES)[number]
export type RankSymbol = (typeof RANKS)[number]

export interface SquareCoordinates {
  file: FileSymbol
  rank: RankSymbol
  fileIndex: number // 0 to 7 (a -> h)
  rankIndex: number // 0 to 7 (8 -> 1)
}

export type BoardGrid = (ChessPieceData | null)[][]

/**
 * Official starting position of a chess game.
 * 8x8 matrix (Row 0 is Rank 8, Row 7 is Rank 1).
 */
export const INITIAL_BOARD_SETUP: BoardGrid = [
  // Rank 8 (Black Major Pieces)
  [
    { type: 'rook', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'rook', color: 'black' },
  ],
  // Rank 7 (Black Pawns)
  [
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
  ],
  // Ranks 6, 5, 4, 3 (Empty)
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  // Rank 2 (White Pawns)
  [
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
  ],
  // Rank 1 (White Major Pieces)
  [
    { type: 'rook', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'rook', color: 'white' },
  ],
]

export interface MoveRecord {
  turnNumber: number
  whiteMove: string
  blackMove?: string
}

/**
 * Placeholder move history for Phase 1 UI demo
 */
export const INITIAL_MOVE_HISTORY: MoveRecord[] = [
  { turnNumber: 1, whiteMove: 'e4', blackMove: 'e5' },
  { turnNumber: 2, whiteMove: 'Nf3', blackMove: 'Nc6' },
  { turnNumber: 3, whiteMove: 'Bc4', blackMove: 'Bc5' },
  { turnNumber: 4, whiteMove: 'O-O', blackMove: 'Nf6' },
  { turnNumber: 5, whiteMove: 'd3', blackMove: 'd6' },
]

/**
 * Placeholder captured pieces for Phase 1 UI demo
 */
export const INITIAL_CAPTURED_PIECES: {
  byWhite: ChessPieceData[]
  byBlack: ChessPieceData[]
} = {
  byWhite: [
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
  ],
  byBlack: [
    { type: 'pawn', color: 'white' },
  ],
}
