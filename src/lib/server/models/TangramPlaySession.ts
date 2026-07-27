import mongoose from "mongoose"

const tangramPlaySessionSchema = new mongoose.Schema(
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
      enum: ["playing", "paused", "completed", "abandoned"],
      default: "playing",
    },
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

tangramPlaySessionSchema.index({ userId: 1, puzzleId: 1 })
tangramPlaySessionSchema.index(
  { userId: 1, puzzleId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["playing", "paused"] } },
  }
)
tangramPlaySessionSchema.index({ userId: 1, status: 1 })
tangramPlaySessionSchema.index({ userId: 1, status: 1, lastSaveAt: -1 })
tangramPlaySessionSchema.index({ puzzleId: 1, status: 1 })

export default mongoose.models.TangramPlaySession ||
  mongoose.model("TangramPlaySession", tangramPlaySessionSchema)
