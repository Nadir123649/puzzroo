import { describe, it, expect } from "vitest";
import {
  sudokuDocs,
  nonogramDocs,
  crossMathDocs,
  tangramDocs,
} from "@/lib/server/seed/transform";

function assertDailyIndexUniquePerDifficulty(docs: any[]) {
  const buckets = new Map<string, number[]>();
  for (const d of docs) {
    const arr = buckets.get(d.difficulty) || [];
    arr.push(d.dailyIndex);
    buckets.set(d.difficulty, arr);
  }
  for (const [diff, idxs] of buckets) {
    expect(new Set(idxs).size).toBe(idxs.length); // unique
    expect(Math.min(...idxs)).toBe(0); // starts at 0
  }
}

describe("seed transforms", () => {
  it("sudoku: produces docs with puzzleId + unique dailyIndex per difficulty", () => {
    const docs = sudokuDocs();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].puzzleId).toBeTruthy();
    expect(typeof docs[0].dailyIndex).toBe("number");
    assertDailyIndexUniquePerDifficulty(docs);
  });

  it("nonogram: decodes sol string into a number[][] solution", () => {
    const docs = nonogramDocs();
    expect(docs.length).toBeGreaterThan(0);
    const d: any = docs[0];
    expect(Array.isArray(d.solution)).toBe(true);
    expect(d.solution.length).toBe(d.size);
    expect(Array.isArray(d.rowClues)).toBe(true);
    assertDailyIndexUniquePerDifficulty(docs);
  });

  it("crossmath: keeps compact fields", () => {
    const docs = crossMathDocs();
    expect(docs.length).toBeGreaterThan(0);
    const d: any = docs[0];
    expect(d.solution).toBeTypeOf("object");
    expect(Array.isArray(d.blanks)).toBe(true);
    assertDailyIndexUniquePerDifficulty(docs);
  });

  it("tangram: keeps polygon arrays", () => {
    const docs = tangramDocs();
    expect(docs.length).toBeGreaterThan(0);
    const d: any = docs[0];
    expect(d.gameType).toBe("tangram");
    expect(Array.isArray(d.individualPiecePolygons)).toBe(true);
    expect(Array.isArray(d.fullPolygon)).toBe(true);
    assertDailyIndexUniquePerDifficulty(docs);
  });
});
