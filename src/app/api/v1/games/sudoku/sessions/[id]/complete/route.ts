import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { completeSessionSchema } from "@/lib/server/validators/sudokuValidator";
import { completeSession, getSession } from "@/lib/server/services/sudoku/sessionService";
import { verifyCompletion } from "@/lib/server/services/sudoku/verificationService";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import { connectDB } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";
import { completionBus } from "@/lib/server/games/completion";
import { recordGameCompletion } from "@/lib/server/games/recordCompletion";
import { ensureGameSubscriptions } from "@/lib/server/games/subscriptions";

export const POST = withAuth(async (req: NextRequest, actor, params) => {
  if (!rateLimit(req, "sudoku-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  const val = validate(completeSessionSchema, body);
  if (val.error) return val.error;

  const session = await getSession(params.id, actor);
  if (session.status !== "playing") throw new Error("session_not_active");

  await connectDB();
  const puzzle = await SudokuPuzzle.findOne({ puzzleId: session.puzzleId }).lean();
  if (!puzzle) throw new Error("puzzle_not_found");

  const verification = await verifyCompletion(val.data!.board, puzzle.solution);
  if (!verification.valid) {
    return errorResponse(400, "verification_failed", verification.error || "Solution is incorrect");
  }

  const hintsUsed = val.data!.hintsUsed ?? session.hintsUsed ?? 0;
  const mistakes = val.data!.mistakes ?? session.mistakes ?? 0;
  const moves = val.data!.moves ?? session.moves ?? 0;

  const updated = await completeSession(
    params.id, actor, val.data!.board, val.data!.elapsedTime,
    hintsUsed, mistakes, moves
  );

  ensureGameSubscriptions();
  completionBus.emit({
    playerId: actor.id,
    sessionId: params.id,
    gameType: "sudoku",
    puzzleId: session.puzzleId,
    difficulty: puzzle.difficulty,
    score: updated.score,
    elapsedTime: updated.elapsedTime,
    mistakes,
    hintsUsed,
    completedAt: new Date(),
    isReplay: session.isReplay || false,
    isGuest: actor.type === "guest",
  });

  // Dashboard "completed" count reads GameProgress — write it server-side too
  // (previously only sudoku did this via the client, and only when logged in).
  if (actor.type === "user") {
    try {
      await recordGameCompletion({
        userId: actor.id,
        gameId: "sudoku",
        puzzleId: session.puzzleId,
        difficulty: puzzle.difficulty,
        time: updated.elapsedTime,
        hintsUsed,
        mistakes,
        moves,
        score: updated.score,
      });
    } catch (err) {
      console.error("[sudoku] recordGameCompletion failed:", err);
    }
  }

  return successResponse({
    ...updated,
    score: updated.score,
    moves,
    hintsUsed,
    mistakes,
    valid: true,
  });
});
