import TangramPuzzle from '@/lib/server/models/TangramPuzzle';
import { verifyPuzzleSolution } from '@/lib/server/tangram/geometry/engine';
import type { TangramPieceState } from '@/lib/server/tangram/types';

function toPieceState(piece: any): TangramPieceState {
  return {
    pieceId: piece.pieceId || piece.id || '',
    position: piece.position || { x: piece.x || 0, y: piece.y || 0 },
    rotation: piece.rotation ?? 0,
    flipped: piece.flipped ?? false,
    placed: piece.placed ?? piece.isPlaced ?? false,
  };
}

export class VerificationEngine {
  async verifyCompletion(puzzleId: string, grid: any[][], pieces?: any[]) {
    if (!pieces || pieces.length === 0) {
      return {
        isComplete: false,
        valid: false,
        accuracy: 0,
        correctCells: 0,
        totalCellsRequired: 0,
        incorrectCells: 0,
        mistakes: 0,
        pieces: [],
        rowValidation: [],
        columnValidation: [],
      };
    }

    const pieceStates = pieces.map(toPieceState);
    const result = await verifyPuzzleSolution({ puzzleId, pieceStates });

    return {
      isComplete: result.valid,
      valid: result.valid,
      accuracy: result.accuracy,
      correctCells: result.piecesCorrect,
      totalCellsRequired: result.totalPieces,
      incorrectCells: result.totalPieces - result.piecesCorrect,
      mistakes: 0,
      pieces: pieces || [],
      rowValidation: [],
      columnValidation: [],
    };
  }
}

export const verificationEngine = new VerificationEngine();