import mongoose from "mongoose";

// Retention for raw analytics events (industry-standard: keep a rolling window).
const RETENTION_DAYS = Number(process.env.ANALYTICS_RETENTION_DAYS || 180);

const analyticsEventSchema = new mongoose.Schema(
  {
    // Identity
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    anonymousId: { type: String, default: null, index: true },
    sessionId: { type: String, default: null, index: true },
    loginSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "LoginSession", default: null },

    // Event (Segment-style call types)
    type: { type: String, enum: ["page", "track", "identify"], default: "track", index: true },
    event: { type: String, default: null }, // "$pageview" for page views, event name for track
    properties: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Context (device / geo / page) — enriched server-side, never trusted from client
    context: {
      path: { type: String, default: null },
      url: { type: String, default: null },
      referrer: { type: String, default: null },
      title: { type: String, default: null },
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
      browser: { type: String, default: null },
      os: { type: String, default: null },
      deviceType: { type: String, default: null },
      location: { type: String, default: null },
      locale: { type: String, default: null },
      screen: { type: String, default: null },
      source: { type: String, default: "web" }, // "web" | "server"
    },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Common query patterns.
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ event: 1, timestamp: -1 });
// TTL: auto-expire old events.
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

export default mongoose.models.AnalyticsEvent ||
  mongoose.model("AnalyticsEvent", analyticsEventSchema);
