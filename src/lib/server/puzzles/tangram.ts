import type { TangramPuzzleResponse } from "./types";
import { validatePuzzle } from "@shared/data/tangram/tangramValidation";

interface TangramDoc {
  puzzleId: string;
  sourceId: string;
  difficulty: TangramPuzzleResponse["difficulty"];
  pieceShapeIds: string[];
  individualPiecePolygons: number[][][];
  fullPolygon: number[][];
  active: boolean;
}

export function tangramToResponse(doc: TangramDoc): TangramPuzzleResponse {
  const response: TangramPuzzleResponse = {
    id: doc.puzzleId,
    sourceId: doc.sourceId,
    difficulty: doc.difficulty,
    pieceShapeIds: doc.pieceShapeIds,
    individualPiecePolygons: doc.individualPiecePolygons,
    fullPolygon: doc.fullPolygon,
    gameType: "tangram",
    active: doc.active,
  };
  const result = validatePuzzle(response as any);
  if (!result.valid) {
    throw new Error(`serve-time sanity failed for tangram ${doc.puzzleId}: ${result.errors.join("; ")}`);
  }
  return response;
}
