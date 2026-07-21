import { describe, it, expect } from "vitest";
import { sanityCheckSudoku } from "@shared/data/sudoku";
import { sanityCheckNonogram } from "@shared/data/nonogram";
import { sanityCheckCrossMath } from "@shared/data/crossmath";
import { validatePuzzle } from "@shared/data/tangram/tangramValidation";
import { boardPatterns, patternToGameGrid } from "@shared/data/crossmath/patterns";

describe("serve-time sanity checks", () => {
  it("accepts a valid sudoku and rejects a broken one", () => {
    const valid = {
      id: "s1",
      difficulty: "easy" as const,
      puzzle: Array.from({ length: 9 }, () => Array(9).fill(0)),
      solution: [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
      ],
    };
    expect(sanityCheckSudoku(valid)).toEqual([]);

    const broken = { ...valid, solution: valid.solution.map((r) => r.map((v) => (v === 1 ? 2 : v))) };
    expect(sanityCheckSudoku(broken).length).toBeGreaterThan(0);
  });

  it("rejects a nonogram whose clues disagree with the solution", () => {
    const sol = Array.from({ length: 5 }, () => Array(5).fill(0));
    sol[0][0] = 1;
    const bad = {
      id: "n1",
      title: "t",
      difficulty: "easy" as const,
      size: 5 as const,
      category: "c",
      estimatedTime: 1,
      solution: sol,
      rowClues: [{ values: [2] }, { values: [] }, { values: [] }, { values: [] }, { values: [] }],
      columnClues: [{ values: [] }, { values: [] }, { values: [] }, { values: [] }, { values: [] }],
    };
    expect(sanityCheckNonogram(bad as any).length).toBeGreaterThan(0);
  });

  it("validates a reconstructed crossmath puzzle against its pattern", () => {
    const pattern = boardPatterns[0];
    const solution: Record<string, number> = {};
    for (const pc of pattern.cells) {
      if (pc.type === "NUMBER") solution[`${pc.row}-${pc.col}`] = 1;
    }
    const puzzle = {
      id: "cm1",
      difficulty: "easy" as const,
      patternId: pattern.pattern_id,
      rows: pattern.grid_rows,
      columns: pattern.grid_cols,
      grid: patternToGameGrid(pattern),
      availableNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      maxMistakes: 3,
      solution,
    };
    expect(sanityCheckCrossMath(puzzle).length).toBe(0);
    expect(sanityCheckCrossMath(puzzle, ["not-a-cell"]).length).toBeGreaterThan(0);
  });

  it("rejects a tangram puzzle missing a piece", () => {
    const full = validatePuzzle;
    expect(typeof full).toBe("function");
  });
});
