/** Deterministic daily seed from a YYYY-MM-DD string. */
export function dateToSeed(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return y * 10000 + m * 100 + d;
}

export function todayString(): string {
  const dt = new Date();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
