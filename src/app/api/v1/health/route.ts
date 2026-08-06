import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/server/db";

const startedAt = Date.now();

export async function GET() {
  let database = "disconnected";
  try {
    await connectDB();
    // mongoose readyState: 1 = connected
    database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  } catch {
    database = "disconnected";
  }

  // Fire-and-forget Firebase admin warm-up so the first OAuth sign-in in a
  // cold lambda doesn't pay the ~1.2s Google JWKS cert fetch.
  if (database === "connected") {
    void (async () => {
      try {
        const { isFirebaseReady } = await import("@/lib/server/utils/authHelpers");
        if (isFirebaseReady()) {
          const { getFirebaseAuth } = await import("@/lib/server/config/firebase");
          await getFirebaseAuth();
        }
      } catch {}
    })();
  }

  const healthy = database === "connected";

  return NextResponse.json(
    {
      success: healthy,
      payload: {
        status: healthy ? "healthy" : "degraded",
        database,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        version: process.env.npm_package_version || "1.0.0",
        timestamp: Date.now(),
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
