import mongoose from "mongoose";

const gameProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "AccountProfile", default: null },
    gameId: { type: String, enum: ["sudoku", "crossmath", "nonogram", "tangram"], required: true },
    puzzleId: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    completed: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    time: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
    moves: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    bestTime: { type: Number, default: 0 },
    resumeState: { type: mongoose.Schema.Types.Mixed, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

gameProgressSchema.index({ userId: 1, profileId: 1, gameId: 1, puzzleId: 1 }, { unique: true });
gameProgressSchema.index({ userId: 1, gameId: 1, completed: 1 });
gameProgressSchema.index({ userId: 1, profileId: 1, gameId: 1, status: 1 });

export default mongoose.models.GameProgress || mongoose.model("GameProgress", gameProgressSchema);
