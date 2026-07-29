import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/apiResponse";
import { connectDB } from "../db";
import LoginSession from "../models/LoginSession";

const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ["HS256"];
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

function validateOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return true;
  const checkOrigin = origin || referer;
  if (!checkOrigin) return true;
  return ALLOWED_ORIGINS.some(allowed => checkOrigin.startsWith(allowed));
}

export async function auth(request: NextRequest) {
  if (!validateOrigin(request)) {
    return { error: errorResponse(403, "forbidden", "Request blocked: invalid origin") };
  }

  const token = request.headers.get("Authorization");
  if (!token) {
    return { error: errorResponse(401, "token_missing", "Access denied. No token provided.") };
  }
  const actualToken = token.startsWith("Bearer ") ? token.slice(7) : token;
  try {
    const decoded = jwt.verify(actualToken, process.env.JWT_ACCESS_SECRET!, {
      algorithms: ALLOWED_ALGORITHMS,
    }) as {
      id: string;
      role: string;
      jti?: string;
      exp?: number;
    };

    if (decoded.jti) {
      await connectDB();
      const session = await LoginSession.findById(decoded.jti);
      if (!session || session.userId.toString() !== decoded.id || session.status !== "active") {
        return { error: errorResponse(401, "session_revoked", "Session has been revoked. Please sign in again.") };
      }
    }

    return { user: decoded };
  } catch {
    return { error: errorResponse(401, "token_invalid", "Invalid or expired token.") };
  }
}
