import {
  getPatternById,
  patternToGameGrid,
} from "@shared/data/crossmath/patterns";
import type { Cell } from "@shared/lib/crossmath/types";
import type { CrossMathPuzzleResponse } from "./types";

interface CrossMathDoc {
  puzzleId: string;
  difficulty: CrossMathPuzzleResponse["difficulty"];
  patternId: number;
  solution: Record<string, number>;
  blanks: string[];
  availableNumbers: number[];
  maxMistakes: number;
}

/**
 * Rebuild the full Cell[][] board from the compact stored record, mirroring the
 * runtime logic in @shared/data/crossmath/index.ts `toPuzzle`. The board shape
 * lives only in patterns.ts; the dataset stays small.
 */
export function crossMathToResponse(doc: CrossMathDoc): CrossMathPuzzleResponse {
  const pattern = getPatternById(doc.patternId);
  if (!pattern) {
    throw new Error(`CrossMath doc references unknown patternId ${doc.patternId}`);
  }

  const grid: Cell[][] = patternToGameGrid(pattern);
  const blankSet = new Set(doc.blanks);

  for (const pc of pattern.cells) {
    if (pc.type === "NUMBER") {
      const key = `${pc.row}-${pc.col}`;
      const cell = grid[pc.row][pc.col];
      const value = doc.solution[key];
      if (value === undefined) continue;
      if (blankSet.has(key)) {
        cell.type = "empty";
        cell.value = undefined;
        cell.isEditable = true;
      } else {
        cell.type = "number";
        cell.value = value;
        cell.isEditable = false;
      }
    }
  }

  const response: CrossMathPuzzleResponse = {
    id: doc.puzzleId,
    difficulty: doc.difficulty,
    patternId: doc.patternId,
    rows: pattern.grid_rows,
    columns: pattern.grid_cols,
    grid,
    availableNumbers: doc.availableNumbers,
    maxMistakes: doc.maxMistakes,
    solution: doc.solution,
  };

  if (grid.length !== pattern.grid_rows || (grid[0]?.length !== pattern.grid_cols)) {
    throw new Error(`serve-time sanity failed for crossmath ${doc.puzzleId}: grid dimensions mismatch`);
  }
  return response;
}
