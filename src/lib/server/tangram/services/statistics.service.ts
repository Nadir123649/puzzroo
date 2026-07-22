import UserStatistics from '../../models/UserStatistics';
import PuzzleStatistics from '../../models/PuzzleStatistics';
import PlaySession from '../../models/PlaySession';

export async function getPlayerStats(userId: string) {
  let stats = await UserStatistics.findOne({
    userId,
    gameId: 'tangram',
  }).lean();

  if (!stats) {
    stats = await UserStatistics.create({
      userId,
      gameId: 'tangram',
      totalPlayed: 0,
      totalCompleted: 0,
      totalAbandoned: 0,
      totalTime: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  }

  const recentSessions = await PlaySession.find({
    userId,
    gameId: 'tangram',
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('puzzleId difficulty status elapsedSeconds completedAt')
    .lean();

  const perDiff = (stats.perDifficulty || {}) as Record<string, { played: number; completed: number; bestTime: number; averageTime: number }>;

  return {
    totalPlayed: stats.totalPlayed,
    totalCompleted: stats.totalCompleted,
    totalAbandoned: stats.totalAbandoned,
    totalTime: stats.totalTime,
    averageTime: stats.averageTime,
    averageAccuracy: stats.averageAccuracy,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    favoriteDifficulty: stats.favoriteDifficulty,
    bestTime: stats.bestTime,
    totalHintsUsed: stats.totalHintsUsed,
    totalMistakes: stats.totalMistakes,
    perDifficulty: {
      easy: perDiff.easy || { played: 0, completed: 0, bestTime: 0, averageTime: 0 },
      medium: perDiff.medium || { played: 0, completed: 0, bestTime: 0, averageTime: 0 },
      hard: perDiff.hard || { played: 0, completed: 0, bestTime: 0, averageTime: 0 },
    },
    recentSessions: recentSessions.map((s) => ({
      sessionId: s._id.toString(),
      puzzleId: s.puzzleId,
      difficulty: s.difficulty,
      status: s.status,
      elapsedSeconds: s.elapsedSeconds,
      completedAt: s.completedAt?.toISOString() || null,
    })),
  };
}

export async function updatePlayerStatsAfterCompletion(
  userId: string,
  difficulty: string,
  elapsedSeconds: number,
  accuracy: number,
  hintsUsed: number,
  mistakes: number
) {
  const stats = await UserStatistics.findOne({ userId, gameId: 'tangram' });

  const update: Record<string, unknown> = {
    $inc: {
      totalCompleted: 1,
      totalTime: elapsedSeconds,
      totalHintsUsed: hintsUsed,
      totalMistakes: mistakes,
      [`perDifficulty.${difficulty}.played`]: 1,
      [`perDifficulty.${difficulty}.completed`]: 1,
    },
    $set: { lastCompletedAt: new Date() },
  };

  if (stats) {
    if (stats.bestTime === 0 || elapsedSeconds < stats.bestTime) {
      update.$set = { ...update.$set as Record<string, unknown>, bestTime: elapsedSeconds };
    }

    const existingAvg = stats.averageAccuracy || 0;
    const existingCompleted = stats.totalCompleted || 0;
    const newAvgAcc = existingCompleted > 0
      ? Math.round(((existingAvg * existingCompleted) + accuracy) / (existingCompleted + 1))
      : accuracy;
    update.$set = { ...update.$set as Record<string, unknown>, averageAccuracy: newAvgAcc };

    const perDiff = (stats.perDifficulty || {}) as Record<string, { averageTime: number; completed: number }>;
    const diffStats = perDiff[difficulty];
    if (diffStats) {
      const totalTime = (diffStats.averageTime || 0) * diffStats.completed + elapsedSeconds;
      const newAvg = totalTime / (diffStats.completed + 1);
      update.$set = {
        ...update.$set as Record<string, unknown>,
        [`perDifficulty.${difficulty}.averageTime`]: Math.round(newAvg),
      };
    }

    const lastCompleted = stats.lastCompletedAt;
    const today = new Date();

    if (lastCompleted) {
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const lastStart = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      const daysDiff = Math.floor((todayStart.getTime() - lastStart.getTime()) / (24 * 60 * 60 * 1000));

      if (daysDiff <= 1) {
        update.$inc = {
          ...update.$inc as Record<string, number>,
          currentStreak: daysDiff === 0 ? 0 : 1,
        };
      } else {
        update.$set = { ...update.$set as Record<string, unknown>, currentStreak: 1 };
      }
    } else {
      update.$set = { ...update.$set as Record<string, unknown>, currentStreak: 1 };
    }

    const newStreak = (update.$inc as Record<string, number>)?.currentStreak
      ? (stats.currentStreak || 0) + ((update.$inc as Record<string, number>).currentStreak || 0)
      : 1;
    if (newStreak > (stats.longestStreak || 0)) {
      update.$set = { ...update.$set as Record<string, unknown>, longestStreak: newStreak };
    }
  }

  await UserStatistics.findOneAndUpdate(
    { userId, gameId: 'tangram' },
    update,
    { upsert: true }
  );
}

export async function updatePuzzleStats(
  puzzleId: string,
  difficulty: string,
  elapsedSeconds: number,
  accuracy: number,
  completed: boolean
) {
  const stat = await PuzzleStatistics.findOne({ puzzleId });

  if (!stat) {
    await PuzzleStatistics.create({
      puzzleId,
      difficulty,
      size: 7,
      totalAttempts: 1,
      totalCompletions: completed ? 1 : 0,
      averageTime: elapsedSeconds,
      averageAccuracy: accuracy,
      bestTime: elapsedSeconds,
      completionRate: completed ? 100 : 0,
    });
    return;
  }

  const update: Record<string, unknown> = {
    $inc: {
      totalAttempts: 1,
      ...(completed ? { totalCompletions: 1 } : {}),
    },
  };

  const newAvgTime = Math.round(
    ((stat.averageTime || 0) * (stat.totalAttempts || 0) + elapsedSeconds) /
    ((stat.totalAttempts || 0) + 1)
  );
  update.$set = { averageTime: newAvgTime };

  if (accuracy > 0) {
    const newAvgAcc = Math.round(
      ((stat.averageAccuracy || 0) * (stat.totalAttempts || 0) + accuracy) /
      ((stat.totalAttempts || 0) + 1)
    );
    update.$set = { ...update.$set as Record<string, unknown>, averageAccuracy: newAvgAcc };
  }

  if (!stat.bestTime || elapsedSeconds < stat.bestTime) {
    update.$set = { ...update.$set as Record<string, unknown>, bestTime: elapsedSeconds };
  }

  const total = (stat.totalAttempts || 0) + 1;
  const completions = (stat.totalCompletions || 0) + (completed ? 1 : 0);
  update.$set = {
    ...update.$set as Record<string, unknown>,
    completionRate: Math.round((completions / total) * 100),
  };

  await PuzzleStatistics.findOneAndUpdate({ puzzleId }, update);
}
