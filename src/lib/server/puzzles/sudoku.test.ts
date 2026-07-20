import { describe, it, expect } from "vitest";
import { decode81, encode81 } from "@/lib/server/puzzles/sudoku";

describe("sudoku codec", () => {
  it("decodes an 81-char string to a 9x9 grid", () => {
    const s = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79";
    const board = decode81(s);
    expect(board).toHaveLength(9);
    expect(board[0]).toHaveLength(9);
    expect(board[0][0]).toBe(5);
    expect(board[0][4]).toBe(7);
  });

  it("round-trips encode/decode", () => {
    const board = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => (r + c) % 10)
    );
    expect(decode81(encode81(board))).toEqual(board);
  });

  it("treats 0 as empty", () => {
    expect(decode81("0".repeat(81))[4][4]).toBe(0);
  });
});
