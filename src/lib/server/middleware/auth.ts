import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/apiResponse";
import { connectDB } from "../db";
import LoginSession from "../models/LoginSession";

export async function auth(request: NextRequest) {
  const token = request.headers.get("Authorization");
  if (!token) {
    return { error: errorResponse(401, "token_missing", "Access denied. No token provided.") };
  }
  const actualToken = token.startsWith("Bearer ") ? token.slice(7) : token;
  try {
    const decoded = jwt.verify(actualToken, process.env.JWT_ACCESS_SECRET!) as {
      id: string;
      role: string;
      jti?: string;
    };

    // If the token is bound to a login session, the session MUST still exist.
    // Deleting the session (logout / logout-all / device revoke) therefore
    // invalidates the token immediately — making logout real, not cosmetic.
    if (decoded.jti) {
      await connectDB();
      const session = await LoginSession.findById(decoded.jti);
      if (!session || session.userId.toString() !== decoded.id) {
        return { error: errorResponse(401, "session_revoked", "Session has been revoked. Please sign in again.") };
      }
    }

    return { user: decoded };
  } catch {
    return { error: errorResponse(401, "token_invalid", "Invalid or expired token.") };
  }
}
