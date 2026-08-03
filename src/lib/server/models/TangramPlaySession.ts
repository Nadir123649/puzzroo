import mongoose from "mongoose"

const tangramPlaySessionSchema = new mongoose.Schema(
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
      enum: ["tangram", "daily_challenge"],
      default: "tangram",
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
    pieceStates: [
      {
        _id: false,
        pieceId: { type: String, required: true },
        position: {
          x: { type: Number, default: 0 },
          y: { type: Number, default: 0 },
        },
        rotation: { type: Number, default: 0 },
        flipped: { type: Boolean, default: false },
        placed: { type: Boolean, default: false },
        snapped: { type: Boolean, default: false },
      },
    ],
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
      piecesCorrect: { type: Number, default: 0 },
      totalPieces: { type: Number, default: 7 },
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
tangramPlaySessionSchema.index(
  { userId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, userId: { $type: "objectId" } },
  }
)
tangramPlaySessionSchema.index(
  { guestId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, guestId: { $type: "string" } },
  }
)
// One active session per (owner, daily challenge).
tangramPlaySessionSchema.index(
  { userId: 1, dailyChallengeId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, userId: { $type: "objectId" } },
  }
)
tangramPlaySessionSchema.index(
  { guestId: 1, dailyChallengeId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] }, guestId: { $type: "string" } },
  }
)

tangramPlaySessionSchema.index({ userId: 1, status: 1, lastSaveAt: -1 })
tangramPlaySessionSchema.index({ guestId: 1, status: 1, lastSaveAt: -1 })
tangramPlaySessionSchema.index({ guestId: 1 })
tangramPlaySessionSchema.index({ puzzleId: 1, status: 1 })
tangramPlaySessionSchema.index({ completedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export default mongoose.models.TangramPlaySession ||
  mongoose.model("TangramPlaySession", tangramPlaySessionSchema)
