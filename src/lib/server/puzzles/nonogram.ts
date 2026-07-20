import type { NonogramPuzzleResponse, Clue } from "./types";
import { sanityCheckNonogram } from "@shared/data/nonogram";

interface NonogramDoc {
  puzzleId: string;
  title: string;
  difficulty: NonogramPuzzleResponse["difficulty"];
  size: number;
  category: string;
  estimatedTime: number;
  solution: number[][];
  rowClues: number[][];
  columnClues: number[][];
}

function toClues(grid: number[][]): Clue[] {
  return grid.map((values) => ({ values }));
}

export function nonogramToResponse(doc: NonogramDoc): NonogramPuzzleResponse {
  const response: NonogramPuzzleResponse = {
    id: doc.puzzleId,
    title: doc.title,
    difficulty: doc.difficulty,
    size: doc.size,
    category: doc.category,
    estimatedTime: doc.estimatedTime,
    solution: doc.solution,
    rowClues: toClues(doc.rowClues),
    columnClues: toClues(doc.columnClues),
  };
  const errors = sanityCheckNonogram(response as any);
  if (errors.length) {
    throw new Error(`serve-time sanity failed for nonogram ${doc.puzzleId}: ${errors.join("; ")}`);
  }
  return response;
}
