import mongoose from "mongoose";

const playSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestId: { type: String },
    puzzleId: { type: String, required: true },
    gameType: { type: String, default: "sudoku", enum: ["sudoku", "daily_challenge"] },
    dailyChallengeId: { type: String },
    difficulty: { type: String, enum: ["easy", "medium", "hard", "expert"] },
    status: {
      type: String,
      enum: ["playing", "paused", "completed", "abandoned"],
      default: "playing",
      required: true,
    },
    currentBoard: { type: String, required: true },
    initialBoard: { type: String, required: true },
    notes: { type: [[String]], default: () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => "")) },
    elapsedTime: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
    moves: { type: Number, default: 0 },
    result: {
      type: String,
      enum: ["incomplete", "solved", "gave_up"],
      default: "incomplete",
    },
    score: { type: Number, default: 0 },
    restartCount: { type: Number, default: 0 },
    isReplay: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    lastSavedAt: { type: Date, default: Date.now },
    pausedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

playSessionSchema.index({ userId: 1, status: 1 });
playSessionSchema.index({ userId: 1, puzzleId: 1 });
playSessionSchema.index({ guestId: 1, status: 1 });
playSessionSchema.index({ guestId: 1, puzzleId: 1 });
playSessionSchema.index(
  { puzzleId: 1, status: 1 },
  {
    partialFilterExpression: { guestId: { $exists: true }, status: { $in: ["playing", "paused"] } },
    name: "guest_active_session",
  }
);
playSessionSchema.index({ userId: 1, puzzleId: 1, status: 1 }, {
  partialFilterExpression: { userId: { $exists: true }, status: { $in: ["playing", "paused"] } },
  unique: true,
});
playSessionSchema.index(
  { puzzleId: 1, guestId: 1, status: 1 },
  {
    partialFilterExpression: { guestId: { $exists: true }, status: { $in: ["playing", "paused"] } },
    unique: true,
  }
);
playSessionSchema.index({ userId: 1, status: 1, startedAt: -1 });
playSessionSchema.index({ userId: 1, completedAt: -1 });
playSessionSchema.index({ guestId: 1, completedAt: -1 });
playSessionSchema.index({ userId: 1, lastSavedAt: -1 });
playSessionSchema.index({ guestId: 1, lastSavedAt: -1 });
playSessionSchema.index({ completedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
playSessionSchema.index({ dailyChallengeId: 1, status: 1 });
playSessionSchema.index({ gameType: 1, status: 1 });
playSessionSchema.index({ dailyChallengeId: 1, userId: 1, status: 1 });
playSessionSchema.index({ dailyChallengeId: 1, guestId: 1, status: 1 });

export default mongoose.models.SudokuPlaySession || mongoose.model("SudokuPlaySession", playSessionSchema);
