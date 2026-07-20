import jwt from "jsonwebtoken";

export function generateAccessToken(user: any, sessionId?: string) {
  return jwt.sign(
    { id: user._id, role: user.role, jti: sessionId || undefined },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: (process.env.ACCESS_TOKEN_EXPIRES || "15m") as any }
  );
}

export function generateRefreshToken(user: any, sessionId?: string) {
  return jwt.sign(
    { id: user._id, jti: sessionId || undefined },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.REFRESH_TOKEN_EXPIRES || "7d") as any }
  );
}

export function buildTokenPayload(user: any, sessionId?: string) {
  return {
    tokenType: "Bearer",
    accessToken: generateAccessToken(user, sessionId),
    accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES || "15m",
    refreshToken: generateRefreshToken(user, sessionId),
  };
}
