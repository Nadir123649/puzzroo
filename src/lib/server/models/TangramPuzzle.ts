import mongoose from "mongoose";

const tangramPuzzleSchema = new mongoose.Schema(
  {
    puzzleId: { type: String, required: true, unique: true },
    sourceId: { type: String },
    game: { type: String, default: "tangram" },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    pieceShapeIds: { type: [String], default: [] },
    individualPiecePolygons: { type: [[[Number]]], required: true },
    fullPolygon: { type: [[Number]], required: true },
    gameType: { type: String, default: "tangram" },
    active: { type: Boolean, default: true },
    hash: { type: String },
    generatorVersion: { type: String },
    dailyIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

tangramPuzzleSchema.index({ game: 1, difficulty: 1, dailyIndex: 1 });

export default mongoose.models.TangramPuzzle ||
  mongoose.model("TangramPuzzle", tangramPuzzleSchema);
