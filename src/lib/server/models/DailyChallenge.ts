import mongoose from "mongoose";

const dailyChallengeSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    puzzleId: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlaySession",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
    },
    completedAt: { type: Date, default: null },
    elapsedSeconds: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dailyChallengeSchema.index({ date: 1, userId: 1 }, { unique: true });
dailyChallengeSchema.index({ date: 1 });
dailyChallengeSchema.index({ userId: 1 });

export default mongoose.models.DailyChallenge ||
  mongoose.model("DailyChallenge", dailyChallengeSchema);
