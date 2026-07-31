import jwt from "jsonwebtoken";

const ACCESS_TOKEN_ALGO: jwt.Algorithm = "HS256";
const REFRESH_TOKEN_ALGO: jwt.Algorithm = "HS256";

export function generateAccessToken(user: any, sessionId?: string) {
  return jwt.sign(
    { id: user._id, role: user.role, jti: sessionId || undefined },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: (process.env.ACCESS_TOKEN_EXPIRES || "15m") as any, algorithm: ACCESS_TOKEN_ALGO }
  );
}

export function generateRefreshToken(user: any, sessionId?: string, tokenVersion?: number) {
  const payload: Record<string, any> = { id: user._id };
  if (sessionId) payload.jti = sessionId;
  if (tokenVersion !== undefined) payload.ver = tokenVersion;
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES || "7d") as any,
    algorithm: REFRESH_TOKEN_ALGO,
  });
}

export function buildTokenPayload(user: any, sessionId?: string, tokenVersion?: number) {
  return {
    tokenType: "Bearer",
    accessToken: generateAccessToken(user, sessionId),
    accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES || "15m",
    refreshToken: generateRefreshToken(user, sessionId, tokenVersion),
    refreshTokenExpires: process.env.REFRESH_TOKEN_EXPIRES || "7d",
  };
}
