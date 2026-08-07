import { describe, it, expect } from "vitest";
import { coordinatesSchema } from "./locationValidator";

describe("coordinatesSchema", () => {
  it("accepts valid GPS fixes", () => {
    const parsed = coordinatesSchema.safeParse({ latitude: 52.52, longitude: 13.405, accuracy: 12.5 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.accuracy).toBe(12.5);
  });

  it("rejects invalid coordinates", () => {
    expect(coordinatesSchema.safeParse({ latitude: 95, longitude: 0 }).success).toBe(false);
    expect(coordinatesSchema.safeParse({ latitude: 0, longitude: -181 }).success).toBe(false);
    expect(coordinatesSchema.safeParse({ latitude: "52" as any, longitude: 13 }).success).toBe(false);
  });

  it("rejects non-numeric accuracy", () => {
    expect(coordinatesSchema.safeParse({ latitude: 1, longitude: 1, accuracy: "high" }).success).toBe(false);
  });

  it("accepts optional timestamp as ISO string", () => {
    const parsed = coordinatesSchema.safeParse({
      latitude: 1,
      longitude: 1,
      timestamp: new Date().toISOString(),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(coordinatesSchema.safeParse({ latitude: 1 }).success).toBe(false);
    expect(coordinatesSchema.safeParse({}).success).toBe(false);
  });
});