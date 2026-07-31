import mongoose from "mongoose";

const leaderboardEntrySchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    gameType: {
      type: String,
      enum: ["sudoku", "crossmath", "nonogram", "tangram"],
      required: true,
    },
    puzzleId: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    score: { type: Number, required: true },
    time: { type: Number, required: true },
    hintsUsed: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
    completedAt: { type: Date, required: true },
    isGuest: { type: Boolean, default: false },
    isReplay: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "leaderboard_entries" }
);

leaderboardEntrySchema.index({ gameType: 1, score: -1, time: 1 });
leaderboardEntrySchema.index({ playerId: 1, gameType: 1 });
leaderboardEntrySchema.index({ gameType: 1, difficulty: 1, score: -1 });

export default mongoose.models.LeaderboardEntry ||
  mongoose.model("LeaderboardEntry", leaderboardEntrySchema);
