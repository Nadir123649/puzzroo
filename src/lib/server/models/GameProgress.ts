import mongoose from "mongoose";

const gameProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameId: { type: String, enum: ["sudoku", "crossmath", "nonogram", "tangram"], required: true },
    puzzleId: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    completed: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    time: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

gameProgressSchema.index({ userId: 1, gameId: 1, puzzleId: 1 }, { unique: true });

export default mongoose.models.GameProgress || mongoose.model("GameProgress", gameProgressSchema);
