import { describe, it, expect } from "vitest";
import { crossMathToResponse } from "@/lib/server/puzzles/crossmath";
import { boardPatterns } from "@shared/data/crossmath/patterns";

describe("crossmath reconstruction", () => {
  it("rebuilds a full Cell[][] grid from a compact doc", () => {
    const pattern = boardPatterns[0];
    const solution: Record<string, number> = {};
    for (const pc of pattern.cells) {
      if (pc.type === "NUMBER") solution[`${pc.row}-${pc.col}`] = 1;
    }
    const doc = {
      puzzleId: "test-cm",
      difficulty: "easy" as const,
      patternId: pattern.pattern_id,
      solution,
      blanks: [] as string[],
      availableNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      maxMistakes: 3,
    };

    const res: any = crossMathToResponse(doc);
    expect(res.id).toBe("test-cm");
    expect(res.rows).toBe(pattern.grid_rows);
    expect(res.columns).toBe(pattern.grid_cols);
    expect(res.grid).toHaveLength(pattern.grid_rows);
    expect(res.grid[0]).toHaveLength(pattern.grid_cols);
    expect(res.availableNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("throws on unknown patternId", () => {
    expect(() =>
      crossMathToResponse({
        puzzleId: "x",
        difficulty: "easy" as const,
        patternId: 999999,
        solution: {},
        blanks: [],
        availableNumbers: [],
        maxMistakes: 3,
      })
    ).toThrow();
  });
});
