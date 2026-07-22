import mongoose from "mongoose";

const difficultyStatsSchema = {
  played: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  bestTime: { type: Number, default: 0 },
  averageTime: { type: Number, default: 0 },
};

const userStatisticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    gameId: { type: String, default: "nonogram" },
    totalPlayed: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    totalAbandoned: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 },
    totalHintsUsed: { type: Number, default: 0 },
    totalMistakes: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    bestTime: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    favoriteDifficulty: { type: String, default: null },
    perDifficulty: {
      easy: difficultyStatsSchema,
      medium: difficultyStatsSchema,
      hard: difficultyStatsSchema,
      expert: difficultyStatsSchema,
    },
    lastPlayedAt: { type: Date, default: null },
    lastCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userStatisticsSchema.index({ userId: 1, gameId: 1 }, { unique: true });

export default mongoose.models.UserStatistics ||
  mongoose.model("UserStatistics", userStatisticsSchema);
