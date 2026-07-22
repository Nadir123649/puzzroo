import type { TangramPuzzleResponse } from "./types";
import { validatePuzzle } from "@shared/data/tangram/tangramValidation";

interface TangramDoc {
  puzzleId: string;
  sourceId?: string;
  difficulty: TangramPuzzleResponse["difficulty"];
  pieceShapeIds: string[];
  individualPiecePolygons: number[][][];
  fullPolygon: number[][];
  active: boolean;
  estimatedSolveTime?: number;
  version?: string;
  status?: string;
  metadata?: {
    category?: string;
    tags?: string[];
    pieceCount?: number;
    allowedTransformations?: string[];
    canvasSize?: { width: number; height: number };
  };
}

export function tangramToResponse(doc: TangramDoc): TangramPuzzleResponse {
  const response: TangramPuzzleResponse = {
    id: doc.puzzleId,
    sourceId: doc.sourceId || '',
    difficulty: doc.difficulty,
    pieceShapeIds: doc.pieceShapeIds,
    individualPiecePolygons: doc.individualPiecePolygons,
    fullPolygon: doc.fullPolygon,
    gameType: "tangram",
    active: doc.active,
  };
  try {
    const result = validatePuzzle(response as any);
    if (!result.valid) {
      console.error(`[tangram] serve-time validation failed for ${doc.puzzleId}: ${result.errors.join("; ")}`);
    }
  } catch (err) {
    console.error(`[tangram] serve-time validation error for ${doc.puzzleId}:`, err);
  }
  return response;
}
