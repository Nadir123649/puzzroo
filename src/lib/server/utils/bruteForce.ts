import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/server/utils/http";

interface BruteForceEntry {
  count: number;
  lockedUntil: number;
}

const store = new Map<string, BruteForceEntry>();

export interface BruteForceResult {
  blocked: boolean;
  retryAfter: number;
}

export function checkBruteForce(request: NextRequest, identifier: string): BruteForceResult {
  const key = `${identifier}:${getClientIp(request)}`;
  const entry = store.get(key);

  if (!entry) return { blocked: false, retryAfter: 0 };

  if (entry.lockedUntil > Date.now()) {
    return { blocked: true, retryAfter: entry.lockedUntil - Date.now() };
  }

  return { blocked: false, retryAfter: 0 };
}

export function recordFailure(request: NextRequest, identifier: string): number | null {
  const key = `${identifier}:${getClientIp(request)}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, lockedUntil: 0 });
    return null;
  }

  if (entry.lockedUntil <= now) {
    entry.lockedUntil = 0;
  }

  entry.count += 1;

  if (entry.count >= 20) {
    entry.lockedUntil = now + 300_000;
    return 300_000;
  }
  if (entry.count >= 10) {
    entry.lockedUntil = now + 30_000;
    return 30_000;
  }
  if (entry.count >= 5) {
    entry.lockedUntil = now + 5_000;
    return 5_000;
  }

  return null;
}

export function resetBruteForce(request: NextRequest, identifier: string): void {
  const key = `${identifier}:${getClientIp(request)}`;
  store.delete(key);
}
