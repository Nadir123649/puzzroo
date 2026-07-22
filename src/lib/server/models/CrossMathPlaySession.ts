import mongoose from "mongoose"

const crossMathPlaySessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    puzzleId: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "abandoned"],
      default: "active",
    },
    grid: { type: Map, of: Number, default: {} },
    blanks: { type: [String], default: [] },
    availableNumbers: { type: [Number], default: [] },
    mistakes: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    elapsedTime: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    pausedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    abandonedAt: { type: Date, default: null },
    lastSaveAt: { type: Date, default: Date.now },
    isReplay: { type: Boolean, default: false },
    restartCount: { type: Number, default: 0 },
    result: {
      correct: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      completedAt: { type: Date, default: null },
      elapsedTime: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

crossMathPlaySessionSchema.index({ userId: 1, puzzleId: 1 })
crossMathPlaySessionSchema.index({ userId: 1, status: 1 })
crossMathPlaySessionSchema.index({ userId: 1, status: 1, lastSaveAt: -1 })
crossMathPlaySessionSchema.index({ puzzleId: 1, status: 1 })

export default mongoose.models.CrossMathPlaySession ||
  mongoose.model("CrossMathPlaySession", crossMathPlaySessionSchema)
