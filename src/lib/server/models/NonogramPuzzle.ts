import mongoose from "mongoose";

const nonogramPuzzleSchema = new mongoose.Schema(
  {
    puzzleId: { type: String, required: true, unique: true },
    game: { type: String, default: "nonogram" },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    size: { type: Number, required: true },
    title: { type: String, default: "" },
    category: { type: String, default: "generated" },
    estimatedTime: { type: Number, default: 0 },
    solution: { type: [[Number]], required: true },
    rowClues: { type: [[Number]], required: true },
    columnClues: { type: [[Number]], required: true },
    hash: { type: String },
    generatorVersion: { type: String },
    dailyIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

nonogramPuzzleSchema.index({ game: 1, difficulty: 1, dailyIndex: 1 });

export default mongoose.models.NonogramPuzzle ||
  mongoose.model("NonogramPuzzle", nonogramPuzzleSchema);
