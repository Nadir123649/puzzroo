import { NextResponse } from "next/server";

/**
 * Retired catch-all. Puzzle endpoints now live under explicit routes:
 *   /api/v1/games, /api/v1/games/[game]/{puzzle,puzzles,daily,complete,leaderboard}
 *   /api/v1/games/{progress,stats}
 * This fallback only catches unmatched /api/v1/games/* paths.
 */
const notFound = () =>
  NextResponse.json(
    { success: false, payload: { error: { code: "not_found", message: "Route not found" } } },
    { status: 404 }
  );

export async function GET() { return notFound(); }
export async function POST() { return notFound(); }
export async function PUT() { return notFound(); }
export async function PATCH() { return notFound(); }
export async function DELETE() { return notFound(); }
