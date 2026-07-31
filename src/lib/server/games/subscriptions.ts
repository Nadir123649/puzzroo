import { completionBus } from "./completion";
import {
  updateUserStatsOnComplete,
  updatePuzzleStatsOnComplete,
} from "@/lib/server/services/sudoku/statisticsService";
import { leaderboardService } from "@/lib/server/leaderboard/LeaderboardService";

let initialized = false;

export function ensureGameSubscriptions(): void {
  if (initialized) return;
  initialized = true;

  completionBus.subscribe(async (event) => {
    if (event.gameType !== "sudoku") return;
    await updateUserStatsOnComplete(event.sessionId, event.playerId);
  });

  completionBus.subscribe(async (event) => {
    if (event.gameType !== "sudoku") return;
    await updatePuzzleStatsOnComplete(event.sessionId);
  });

  completionBus.subscribe(async (event) => {
    await leaderboardService.recordEntry(event);
  });
}
