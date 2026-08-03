import type { TangramDifficulty } from "./types"
import { randomPuzzleEngine } from "./services/RandomPuzzleEngine"

export function tangramToResponse(doc: any) {
  if (!doc) return null
  return {
    id: doc.puzzleId || String(doc._id),
    puzzleId: doc.puzzleId || String(doc._id),
    game: doc.game || "tangram",
    difficulty: doc.difficulty || "medium",
    pieceShapeIds: doc.pieceShapeIds || [],
    individualPiecePolygons: doc.individualPiecePolygons || [],
    fullPolygon: doc.fullPolygon || [],
    metadata: doc.metadata || {},
    active: doc.active ?? true,
  }
}

export { randomPuzzleEngine }
export type { TangramDifficulty }