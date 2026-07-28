import mongoose from "mongoose"

const nonogramPlaySessionSchema = new mongoose.Schema(
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
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    status: {
      type: String,
      enum: ["playing", "paused", "completed", "abandoned"],
      default: "playing",
    },
    grid: { type: [[String]], default: [] },
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

nonogramPlaySessionSchema.index({ userId: 1, puzzleId: 1 })
nonogramPlaySessionSchema.index(
  { userId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] } },
  }
)
nonogramPlaySessionSchema.index({ userId: 1, status: 1 })
nonogramPlaySessionSchema.index({ userId: 1, status: 1, lastSaveAt: -1 })
nonogramPlaySessionSchema.index({ puzzleId: 1, status: 1 })

export default mongoose.models.NonogramPlaySession ||
  mongoose.model("NonogramPlaySession", nonogramPlaySessionSchema)