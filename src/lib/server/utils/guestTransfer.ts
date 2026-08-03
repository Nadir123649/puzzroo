import mongoose from "mongoose";
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession";
import SudokuPlaySession from "@/lib/server/models/sudoku/PlaySession";
import TangramPlaySession from "@/lib/server/models/TangramPlaySession";

/**
 * Hands a guest's game sessions over to their converted account. Guest
 * sessions are keyed by the browser uuid (x-guest-id) in the `guestId`
 * field; after conversion the account owns them under `userId`.
 *
 * crossmath, sudoku and tangram all persist guest sessions under `guestId`.
 *
 * Safe against collisions: the converting account is brand-new, so no
 * existing sessions reference its userId.
 */
export async function transferGuestSessions(guestId: string, userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const [crossmath, sudoku, tangram] = await Promise.all([
    CrossMathPlaySession.updateMany({ guestId }, { $set: { userId: uid }, $unset: { guestId: "" } }),
    SudokuPlaySession.updateMany({ guestId }, { $set: { userId: uid }, $unset: { guestId: "" } }),
    TangramPlaySession.updateMany({ guestId }, { $set: { userId: uid }, $unset: { guestId: "" } }),
  ]);
  return crossmath.modifiedCount + sudoku.modifiedCount + tangram.modifiedCount;
}
