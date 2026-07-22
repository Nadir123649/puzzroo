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
    estimatedSolveTime: { type: Number, default: 0 },
    version: { type: String, default: "1.0" },
    status: {
      type: String,
      enum: ["active", "deprecated", "retired"],
      default: "active",
    },
    dailyEligible: { type: Boolean, default: true },
    metadata: {
      category: { type: String, default: null },
      tags: { type: [String], default: [] },
      pieceCount: { type: Number, default: 7 },
      allowedTransformations: { type: [String], default: ["rotate"] },
      canvasSize: {
        width: { type: Number, default: 20 },
        height: { type: Number, default: 20 },
      },
    },
  },
  { timestamps: true }
);

tangramPuzzleSchema.index({ game: 1, difficulty: 1, dailyIndex: 1 });
tangramPuzzleSchema.index({ status: 1, active: 1 });
tangramPuzzleSchema.index({ "metadata.category": 1 });

export default mongoose.models.TangramPuzzle ||
  mongoose.model("TangramPuzzle", tangramPuzzleSchema);
