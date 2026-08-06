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

  it("todayString returns the UTC date, not the local date", () => {
    const local = new Date();
    const localStr = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
    const utcStr = new Date().toISOString().split("T")[0];
    expect(todayString()).toBe(utcStr);
    if (localStr !== utcStr) {
      expect(todayString()).not.toBe(localStr);
    }
  });
});
