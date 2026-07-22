import mongoose from "mongoose"

const crossMathPuzzleSchema = new mongoose.Schema(
  {
    puzzleId: { type: String, required: true, unique: true },
    game: { type: String, default: "crossmath", required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    patternId: { type: Number, required: true },
    solution: { type: mongoose.Schema.Types.Mixed, required: true },
    blanks: { type: [String], default: [] },
    availableNumbers: { type: [Number], default: [] },
    maxMistakes: { type: Number, default: 3 },
    hash: { type: String },
    generatorVersion: { type: String },
    dailyIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
)

crossMathPuzzleSchema.index({ game: 1, difficulty: 1, dailyIndex: 1 })
crossMathPuzzleSchema.index({ puzzleId: 1 }, { unique: true })

export default mongoose.models.CrossMathPuzzle ||
  mongoose.model("CrossMathPuzzle", crossMathPuzzleSchema)
