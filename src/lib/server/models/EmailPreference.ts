import mongoose from "mongoose";

const emailPreferenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    updates: { type: Boolean, default: true },
    dailyChallenge: { type: Boolean, default: true },
    competition: { type: Boolean, default: false },
    tips: { type: Boolean, default: true },
    security: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.EmailPreference || mongoose.model("EmailPreference", emailPreferenceSchema);
