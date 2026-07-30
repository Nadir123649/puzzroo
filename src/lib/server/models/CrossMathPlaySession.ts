import mongoose from "mongoose"

const crossMathPlaySessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    guestId: { type: String, index: true },
    puzzleId: { type: String, required: true },
    gameType: {
      type: String,
      enum: ["crossmath", "daily_challenge"],
      default: "crossmath",
      index: true,
    },
    dailyChallengeId: { type: String, default: null },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    status: {
      type: String,
      enum: ["playing", "paused", "completed", "abandoned"],
      default: "playing",
    },
    grid: { type: Map, of: Number, default: {} },
    blanks: { type: [String], default: [] },
    availableNumbers: { type: [Number], default: [] },
    mistakes: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    moves: { type: Number, default: 0 },
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
      moves: { type: Number, default: 0 },
      mistakes: { type: Number, default: 0 },
      hintsUsed: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

crossMathPlaySessionSchema.index({ userId: 1, puzzleId: 1 })
crossMathPlaySessionSchema.index({ guestId: 1, puzzleId: 1 })
crossMathPlaySessionSchema.index(
  { userId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] } },
  }
)
crossMathPlaySessionSchema.index(
  { guestId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] } },
  }
)
crossMathPlaySessionSchema.index({ userId: 1, status: 1 })
crossMathPlaySessionSchema.index({ guestId: 1, status: 1 })
crossMathPlaySessionSchema.index({ guestId: 1, gameType: 1, status: 1 })
crossMathPlaySessionSchema.index({ guestId: 1, dailyChallengeId: 1, status: 1 })
crossMathPlaySessionSchema.index({ userId: 1, status: 1, completedAt: -1 })
crossMathPlaySessionSchema.index({ userId: 1, status: 1, lastSaveAt: -1 })
crossMathPlaySessionSchema.index({ guestId: 1, status: 1, completedAt: -1 })
crossMathPlaySessionSchema.index({ guestId: 1, status: 1, lastSaveAt: -1 })
crossMathPlaySessionSchema.index({ puzzleId: 1, status: 1 })
crossMathPlaySessionSchema.index({ completedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export default mongoose.models.CrossMathPlaySession ||
  mongoose.model("CrossMathPlaySession", crossMathPlaySessionSchema)
