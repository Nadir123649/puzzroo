import { NextResponse } from "next/server";

/**
 * Retired catch-all. Puzzle endpoints now live under explicit routes:
 *   /api/v1/games, /api/v1/games/[game]/{puzzle,puzzles,daily,complete,leaderboard}
 *   /api/v1/games/{progress,stats}
 * This fallback only catches unmatched /api/v1/games/* paths.
 */
export async function GET() {
  return NextResponse.json(
    { success: false, payload: { error: { code: "not_found", message: "Route not found" } } },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, payload: { error: { code: "not_found", message: "Route not found" } } },
    { status: 404 }
  );
}
