import mongoose from "mongoose"

const nonogramPlaySessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    guestId: { type: String, default: null },
    gameType: {
      type: String,
      enum: ["nonogram", "daily_challenge"],
      default: "nonogram",
      index: true,
    },
    dailyChallengeId: { type: String, default: null, index: true },
    puzzleId: { type: String, required: true },
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

// One active session per (owner, puzzle) — unique while playing/paused.
// Partial filters require the owner field to be a real string/ObjectId so
// user docs never collide on the guest index (null would be a shared key).
nonogramPlaySessionSchema.index(
  { userId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, userId: { $type: "objectId" } },
  }
)
nonogramPlaySessionSchema.index(
  { guestId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, guestId: { $type: "string" } },
  }
)
// One active session per (owner, daily challenge).
nonogramPlaySessionSchema.index(
  { userId: 1, dailyChallengeId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, userId: { $type: "objectId" } },
  }
)
nonogramPlaySessionSchema.index(
  { guestId: 1, dailyChallengeId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, guestId: { $type: "string" } },
  }
)

nonogramPlaySessionSchema.index({ userId: 1, status: 1, lastSaveAt: -1 })
nonogramPlaySessionSchema.index({ guestId: 1, status: 1, lastSaveAt: -1 })
nonogramPlaySessionSchema.index({ guestId: 1 })
nonogramPlaySessionSchema.index({ puzzleId: 1, status: 1 })
nonogramPlaySessionSchema.index({ completedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })
nonogramPlaySessionSchema.index({ abandonedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export default mongoose.models.NonogramPlaySession ||
  mongoose.model("NonogramPlaySession", nonogramPlaySessionSchema)