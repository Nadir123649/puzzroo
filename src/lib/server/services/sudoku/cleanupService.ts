import { connectDB } from "@/lib/server/db";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";

export async function cleanupStaleSessions(): Promise<number> {
  await connectDB();
  const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await PlaySession.updateMany(
    {
      status: { $in: ["playing", "paused"] },
      updatedAt: { $lt: staleThreshold },
    },
    {
      $set: {
        status: "abandoned",
        result: "gave_up",
        lastSavedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

export async function validateElapsedTime(
  clientTime: number,
  sessionStartTime: Date,
  pausedDuration: number
): Promise<{ valid: boolean; maxExpectedTime: number }> {
  const now = Date.now();
  const elapsedMs = now - sessionStartTime.getTime() - pausedDuration;
  const maxExpectedSeconds = Math.floor(elapsedMs / 1000) + 30;

  if (clientTime > maxExpectedSeconds) {
    return { valid: false, maxExpectedTime: maxExpectedSeconds };
  }

  return { valid: true, maxExpectedTime: maxExpectedSeconds };
}
