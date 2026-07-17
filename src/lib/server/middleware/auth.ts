import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/apiResponse";

export function auth(request: NextRequest) {
  const token = request.headers.get("Authorization");
  if (!token) {
    return { error: errorResponse(401, "token_missing", "Access denied. No token provided.") };
  }
  const actualToken = token.startsWith("Bearer ") ? token.slice(7) : token;
  try {
    const decoded = jwt.verify(actualToken, process.env.JWT_ACCESS_SECRET!) as { id: string; role: string };
    return { user: decoded };
  } catch {
    return { error: errorResponse(401, "token_invalid", "Invalid or expired token.") };
  }
}
