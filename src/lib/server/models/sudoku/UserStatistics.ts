import mongoose from "mongoose";

const userStatisticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    gamesPlayed: { type: Number, default: 0 },
    gamesCompleted: { type: Number, default: 0 },
    gamesAbandoned: { type: Number, default: 0 },
    totalPlayTime: { type: Number, default: 0 },
    averageSolveTime: { type: Number, default: 0 },
    bestTime: {
      time: { type: Number, default: null },
      puzzleId: { type: String, default: null },
      difficulty: { type: String, default: null },
    },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    favoriteDifficulty: { type: String, default: null },
    totalHintsUsed: { type: Number, default: 0 },
    totalMistakes: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    lastPlayedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.UserStatistics || mongoose.model("UserStatistics", userStatisticsSchema);
