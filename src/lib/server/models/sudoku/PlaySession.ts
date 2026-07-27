import mongoose from "mongoose";

const playSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    puzzleId: { type: String, required: true },
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
    mistakes: {
      type: [
        {
          cell: String,
          expected: Number,
          received: Number,
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    moves: {
      type: [
        {
          cell: String,
          from: Number,
          to: Number,
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    result: {
      type: String,
      enum: ["incomplete", "solved", "gave_up"],
      default: "incomplete",
    },
    score: { type: Number, default: 0 },
    restartCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    lastSavedAt: { type: Date, default: Date.now },
    pausedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

playSessionSchema.index({ userId: 1, status: 1 });
playSessionSchema.index({ userId: 1, puzzleId: 1 });
playSessionSchema.index({ userId: 1, status: 1, startedAt: -1 });
playSessionSchema.index({ userId: 1, completedAt: -1 });

export default mongoose.models.SudokuPlaySession || mongoose.model("SudokuPlaySession", playSessionSchema);
