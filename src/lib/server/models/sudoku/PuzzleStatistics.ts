import mongoose from "mongoose";

const puzzleStatisticsSchema = new mongoose.Schema(
  {
    puzzleId: { type: mongoose.Schema.Types.ObjectId, ref: "SudokuPuzzle", required: true, unique: true },
    totalPlays: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    totalAbandonments: { type: Number, default: 0 },
    averageSolveTime: { type: Number, default: 0 },
    averageMistakes: { type: Number, default: 0 },
    averageHints: { type: Number, default: 0 },
    fastestSolve: {
      time: { type: Number, default: null },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    completionsByDifficulty: {
      type: [{ difficulty: String, count: Number }],
      default: [],
    },
    lastPlayedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.PuzzleStatistics || mongoose.model("PuzzleStatistics", puzzleStatisticsSchema);
