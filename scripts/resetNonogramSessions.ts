/**
 * Reset all user progress for the nonogram game.
 *
 * Deletes (or dry-runs) every nonogram-scoped record so the new gold
 * dataset ships to a clean slate:
 *   - NonogramPlaySession       (all play sessions, incl. daily_challenge)
 *   - GameProgress              (gameId = nonogram)
 *   - UserStatistics            (gameId = nonogram)
 *   - PuzzleStatistics          (puzzleId prefix `nonogram-`)
 *   - DailyChallenge            (puzzleId prefix `nonogram-`)
 *
 * Run with: npm run db:reset:nonogram  (or --dry to preview counts).
 * Requires MONGO_URI in the environment.
 */

async function main() {
  const fs = await import("fs");
  const path = await import("path");
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }

  const { connectDB } = await import("../src/lib/server/db");
  const NonogramPlaySession = (await import("../src/lib/server/models/NonogramPlaySession")).default;
  const GameProgress = (await import("../src/lib/server/models/GameProgress")).default;
  const UserStatistics = (await import("../src/lib/server/models/UserStatistics")).default;
  const PuzzleStatistics = (await import("../src/lib/server/models/PuzzleStatistics")).default;
  const DailyChallenge = (await import("../src/lib/server/models/DailyChallenge")).default;

  const isDry = process.argv.includes("--dry");

  await connectDB();

  const tasks: Array<{ label: string; model: any; filter: Record<string, unknown> }> = [
    { label: "NonogramPlaySession", model: NonogramPlaySession, filter: {} },
    { label: "GameProgress(nonogram)", model: GameProgress, filter: { gameId: "nonogram" } },
    { label: "UserStatistics(nonogram)", model: UserStatistics, filter: { gameId: "nonogram" } },
    { label: "PuzzleStatistics(nonogram)", model: PuzzleStatistics, filter: { puzzleId: /^nonogram-/ } },
    { label: "DailyChallenge(nonogram)", model: DailyChallenge, filter: { puzzleId: /^nonogram-/ } },
  ];

  for (const task of tasks) {
    const count = await task.model.countDocuments(task.filter);
    if (!isDry) {
      await task.model.deleteMany(task.filter);
    }
    console.log(`[reset] ${task.label.padEnd(28)} ${isDry ? "would delete" : "deleted"} ${count}`);
  }

  console.log(`[reset] ${isDry ? "dry run complete." : "done. Nonogram progress reset."}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[reset] failed:", err);
  process.exit(1);
});
