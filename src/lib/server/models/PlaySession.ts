import mongoose from "mongoose";

const playSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    puzzleId: { type: String, required: true },
    gameId: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "abandoned"],
      default: "active",
    },
    grid: { type: [[String]], default: [] },
    pieceStates: [
      {
        pieceId: { type: String, required: true },
        position: {
          x: { type: Number, default: 0 },
          y: { type: Number, default: 0 },
        },
        rotation: { type: Number, default: 0 },
        flipped: { type: Boolean, default: false },
        placed: { type: Boolean, default: false },
      },
    ],
    pausedState: { type: mongoose.Schema.Types.Mixed, default: null },
    hints: [
      {
        type: { type: String, enum: ["ghost", "snap"], default: "ghost" },
        pieceId: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    startedAt: { type: Date, default: Date.now },
    pausedAt: { type: Date, default: null },
    resumedAt: { type: Date, default: null },
    lastSaveAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    elapsedSeconds: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    maxHints: { type: Number, default: 3 },
    mistakes: { type: Number, default: 0 },
    maxMistakes: { type: Number, default: 0 },
    restartCount: { type: Number, default: 0 },
    replayCount: { type: Number, default: 0 },
    abandonReason: { type: String, default: null },
    completionResult: {
      isComplete: { type: Boolean, default: false },
      isCorrect: { type: Boolean, default: false },
      accuracy: { type: Number, default: 0 },
      correctCells: { type: Number, default: 0 },
      totalCells: { type: Number, default: 0 },
      piecesCorrect: { type: Number, default: 0 },
      totalPieces: { type: Number, default: 7 },
    },
  },
  { timestamps: true }
);

playSessionSchema.index({ userId: 1, puzzleId: 1 });
playSessionSchema.index({ userId: 1, status: 1 });
playSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
playSessionSchema.index({ puzzleId: 1, status: 1 });
playSessionSchema.index({ userId: 1, gameId: 1, status: 1 });

// Ensure fresh registration — delete stale model if another module registered it with wrong schema
if (mongoose.models.PlaySession) {
  delete mongoose.models.PlaySession;
}
const PlaySession = mongoose.model("PlaySession", playSessionSchema);
export default PlaySession;
