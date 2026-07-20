import type { TangramPuzzleResponse } from "./types";

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
  return {
    id: doc.puzzleId,
    sourceId: doc.sourceId,
    difficulty: doc.difficulty,
    pieceShapeIds: doc.pieceShapeIds,
    individualPiecePolygons: doc.individualPiecePolygons,
    fullPolygon: doc.fullPolygon,
    gameType: "tangram",
    active: doc.active,
  };
}
