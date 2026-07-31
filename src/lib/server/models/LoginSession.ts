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
    tokenVersion: { type: Number, default: 0 },
    // When the refresh token was last rotated. Lets the refresh handler
    // distinguish "concurrent rotation race" (multiple tabs / parallel
    // refreshes reusing the same cookie within a short window) from genuine
    // replay of a long-stale token.
    rotatedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: Date.now },
    deviceFingerprint: { type: String, default: null },
    status: { type: String, enum: ["active", "expired", "logged_out", "revoked"], default: "active" },
  },
  { timestamps: true }
);

loginSessionSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
loginSessionSchema.index({ userId: 1, deviceFingerprint: 1, status: 1 });

export default mongoose.models.LoginSession || mongoose.model("LoginSession", loginSessionSchema);
