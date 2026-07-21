import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import type { VerificationResult } from "../types";

function computeLineClues(line: number[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) {
      run++;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues;
}

export class VerificationEngine {
  async verifyCompletion(
    puzzleId: string,
    playerGrid: Array<Array<{ state: string }>>
  ): Promise<VerificationResult> {
    const puzzle = await NonogramPuzzle.findOne({ puzzleId }).lean();
    if (!puzzle) {
      throw new Error("puzzle_not_found");
    }

    const solution = puzzle.solution as number[][];
    const size = puzzle.size;

    if (playerGrid.length !== size) {
      throw new Error("invalid_grid_dimensions");
    }

    const rowValidation: VerificationResult["rowValidation"] = [];
    const columnValidation: VerificationResult["columnValidation"] = [];

    let correctCells = 0;
    let incorrectCells = 0;
    let totalCellsRequired = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (solution[r][c] === 1) {
          totalCellsRequired++;
          if (playerGrid[r][c]?.state === "filled") {
            correctCells++;
          } else {
            incorrectCells++;
          }
        } else if (playerGrid[r][c]?.state === "filled") {
          incorrectCells++;
        }
      }
    }

    for (let r = 0; r < size; r++) {
      const line = playerGrid[r].map((c) => (c.state === "filled" ? 1 : 0));
      const actualClues = computeLineClues(line);
      const expectedClues = puzzle.rowClues[r] as number[];
      const match =
        JSON.stringify(actualClues) === JSON.stringify(expectedClues);
      rowValidation.push(match ? "correct" : "incorrect");
    }

    for (let c = 0; c < size; c++) {
      const line = playerGrid.map((row) =>
        row[c].state === "filled" ? 1 : 0
      );
      const actualClues = computeLineClues(line);
      const expectedClues = puzzle.columnClues[c] as number[];
      const match =
        JSON.stringify(actualClues) === JSON.stringify(expectedClues);
      columnValidation.push(match ? "correct" : "incorrect");
    }

    const mistakes = incorrectCells;
    const accuracy =
      totalCellsRequired > 0
        ? Math.round((correctCells / (correctCells + mistakes)) * 100)
        : 100;

    const isComplete = rowValidation.every((v) => v === "correct")
      && columnValidation.every((v) => v === "correct")
      && correctCells === totalCellsRequired;

    return {
      isComplete,
      totalCellsRequired,
      correctCells,
      incorrectCells: mistakes,
      accuracy,
      mistakes,
      rowValidation,
      columnValidation,
    };
  }

  verifyTiming(elapsedSeconds: number, estimatedTime: number): boolean {
    const maxReasonableTime = estimatedTime * 10;
    return elapsedSeconds >= 0 && elapsedSeconds <= maxReasonableTime;
  }
}

export const verificationEngine = new VerificationEngine();
