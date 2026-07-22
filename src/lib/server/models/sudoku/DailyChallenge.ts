import mongoose from "mongoose";

const dailyChallengeSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    puzzleId: { type: mongoose.Schema.Types.ObjectId, ref: "SudokuPuzzle", required: true },
    difficulty: { type: String, required: true },
    playerCount: { type: Number, default: 0 },
    completionCount: { type: Number, default: 0 },
    averageSolveTime: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dailyChallengeSchema.index({ date: 1 }, { unique: true });

export default mongoose.models.DailyChallenge || mongoose.model("DailyChallenge", dailyChallengeSchema);
