import mongoose from "mongoose";
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession";
import SudokuPlaySession from "@/lib/server/models/sudoku/PlaySession";

/**
 * Hands a guest's game sessions over to their converted account. Guest
 * sessions are keyed by the browser uuid (x-guest-id) in the `guestId`
 * field; after conversion the account owns them under `userId`.
 *
 * Only crossmath + sudoku persist guest sessions (tangram/nonogram sessions
 * require an ObjectId userId, so guests never write there).
 *
 * Safe against collisions: the converting account is brand-new, so no
 * existing sessions reference its userId.
 */
export async function transferGuestSessions(guestId: string, userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const [crossmath, sudoku] = await Promise.all([
    CrossMathPlaySession.updateMany({ guestId }, { $set: { userId: uid }, $unset: { guestId: "" } }),
    SudokuPlaySession.updateMany({ guestId }, { $set: { userId: uid }, $unset: { guestId: "" } }),
  ]);
  return crossmath.modifiedCount + sudoku.modifiedCount;
}
