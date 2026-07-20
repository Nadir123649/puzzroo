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
