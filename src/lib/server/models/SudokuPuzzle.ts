import mongoose from "mongoose";

const sudokuPuzzleSchema = new mongoose.Schema(
  {
    puzzleId: { type: String, required: true, unique: true },
    game: { type: String, default: "sudoku" },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "expert"],
      required: true,
    },
    puzzle: { type: String, required: true },
    solution: { type: String, required: true },
    givens: { type: Number },
    tier: { type: Number },
    techniques: { type: [String], default: [] },
    solvableByLogic: { type: Boolean },
    size: { type: Number, default: 9 },
    hash: { type: String },
    generatorVersion: { type: String },
    dailyIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

sudokuPuzzleSchema.index({ game: 1, difficulty: 1, dailyIndex: 1 });

export default mongoose.models.SudokuPuzzle ||
  mongoose.model("SudokuPuzzle", sudokuPuzzleSchema);
