import { describe, it, expect } from "vitest";
import { dateToSeed, todayString } from "@/lib/server/puzzles/daily";

describe("daily seed helpers", () => {
  it("converts YYYY-MM-DD to a stable numeric seed", () => {
    expect(dateToSeed("2026-07-20")).toBe(20260720);
    expect(dateToSeed("2026-07-20")).toBe(dateToSeed("2026-07-20"));
  });

  it("different dates yield different seeds", () => {
    expect(dateToSeed("2026-07-20")).not.toBe(dateToSeed("2026-07-21"));
  });

  it("todayString matches YYYY-MM-DD", () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
