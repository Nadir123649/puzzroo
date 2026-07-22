import mongoose from "mongoose";

const puzzleStatisticsSchema = new mongoose.Schema(
  {
    puzzleId: { type: String, required: true, unique: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    size: { type: Number, required: true },
    totalAttempts: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    totalAbandons: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    bestTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

puzzleStatisticsSchema.index({ difficulty: 1 });

export default mongoose.models.PuzzleStatistics ||
  mongoose.model("PuzzleStatistics", puzzleStatisticsSchema);
