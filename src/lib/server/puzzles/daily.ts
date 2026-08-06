/** Deterministic daily seed from a YYYY-MM-DD string. */
export function dateToSeed(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return y * 10000 + m * 100 + d;
}

export function todayString(): string {
  return new Date().toISOString().split("T")[0];
}
