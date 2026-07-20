import mongoose from "mongoose";

const loginSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    browser: { type: String, default: null },
    os: { type: String, default: null },
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "unknown" },
    location: { type: String, default: null },
    isCurrent: { type: Boolean, default: true },
    provider: { type: String, default: null },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.LoginSession || mongoose.model("LoginSession", loginSessionSchema);
