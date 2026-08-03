import TangramPuzzle from '@/lib/server/models/TangramPuzzle';
import { verifyPuzzleSolution, checkCoverage, transformPolygon } from '@/lib/server/tangram/geometry/engine';
import type { TangramPieceState } from '@/lib/server/tangram/types';
import type { TangramVerificationResult } from '../types';

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
        piecesCorrect: 0,
        totalPieces: 0,
        pieceResults: [],
        errors: ['No pieces provided'],
        coverage: { covered: false, coverageRatio: 0, errors: ['No pieces to verify'] },
      } satisfies TangramVerificationResult;
    }

    const pieceStates = pieces.map(toPieceState);
    const result = await verifyPuzzleSolution({ puzzleId, pieceStates });

    let coverage: { covered: boolean; coverageRatio: number; errors: string[] } | undefined;

    try {
      const puzzle = await TangramPuzzle.findOne({ puzzleId }).lean();
      if (puzzle?.fullPolygon) {
        const allPolygons = pieceStates.map((state: TangramPieceState) => {
          const idx = (puzzle.pieceShapeIds as string[])?.indexOf(state.pieceId);
          const original = idx >= 0 ? (puzzle.individualPiecePolygons as number[][][])[idx] : [];
          return transformPolygon(original, state.position, state.rotation, state.flipped);
        });
        coverage = checkCoverage(allPolygons, puzzle.fullPolygon as number[][]);
      }
    } catch {
      coverage = { covered: false, coverageRatio: 0, errors: ['Coverage check unavailable'] };
    }

    return {
      isComplete: result.valid,
      valid: result.valid,
      accuracy: result.accuracy,
      piecesCorrect: result.piecesCorrect,
      totalPieces: result.totalPieces,
      pieceResults: result.pieceResults.map(p => ({
        pieceId: p.pieceId,
        correct: p.correct,
        positionMatch: p.positionMatch,
        rotationMatch: p.rotationMatch,
        error: p.error,
      })),
      errors: result.errors,
      coverage,
    } satisfies TangramVerificationResult;
  }
}

export const verificationEngine = new VerificationEngine();
