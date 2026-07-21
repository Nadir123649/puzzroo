import { describe, it, expect } from "vitest";
import {
  getPuzzleQuerySchema,
  completeSchema,
  leaderboardQuerySchema,
  gameIdSchema,
} from "@/lib/server/validators/puzzleValidator";

describe("puzzle validators", () => {
  it("accepts a valid play query", () => {
    const r = getPuzzleQuerySchema.safeParse({ difficulty: "hard", exclude: "abc" });
    expect(r.success).toBe(true);
  });

  it("rejects a malformed date", () => {
    const r = getPuzzleQuerySchema.safeParse({ date: "07/20/2026" });
    expect(r.success).toBe(false);
  });

  it("complete schema rejects expert difficulty", () => {
    const r = completeSchema.safeParse({
      puzzleId: "x",
      difficulty: "expert",
      score: 10,
    });
    expect(r.success).toBe(false);
  });

  it("complete schema accepts easy/medium/hard with analytics", () => {
    const r = completeSchema.safeParse({
      puzzleId: "x",
      difficulty: "medium",
      score: 100,
      time: 42,
      hintsUsed: 2,
      mistakes: 1,
      moves: 30,
    });
    expect(r.success).toBe(true);
  });

  it("leaderboard defaults period to all", () => {
    const r = leaderboardQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    expect((r.data as any).period).toBe("all");
  });

  it("gameIdSchema allows only the four games", () => {
    expect(gameIdSchema.safeParse("sudoku").success).toBe(true);
    expect(gameIdSchema.safeParse("chess").success).toBe(false);
  });
});
