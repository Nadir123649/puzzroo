import mongoose from "mongoose";

const userLocationSchema = new mongoose.Schema(
  {
    // Either a real user or a browser guest — never both.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestId: { type: String, default: null, index: true },
    // IP the request came in on (ip source only; never for gps).
    ip: { type: String, default: null },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    city: { type: String, default: null },
    region: { type: String, default: null },
    country: { type: String, default: null },
    // GPS accuracy in meters (null for IP fallback).
    accuracy: { type: Number, default: null },
    source: { type: String, enum: ["gps", "ip"], required: true },
  },
  { timestamps: true }
);

// One row per identity, always updated in place.
// userId is an ObjectId for users, null for guests; the pair is unique per
// identity so GPS updates overwrite the same document rather than stacking.
userLocationSchema.index({ userId: 1, guestId: 1 }, { unique: true, sparse: true });

export default mongoose.models.UserLocation || mongoose.model("UserLocation", userLocationSchema);