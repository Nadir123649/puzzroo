import jwt from "jsonwebtoken";

export function generateAccessToken(user: any, sessionId?: string) {
  return jwt.sign(
    { id: user._id, role: user.role, jti: sessionId || undefined },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: (process.env.ACCESS_TOKEN_EXPIRES || "7d") as any }
  );
}

export function generateRefreshToken(user: any, sessionId?: string, tokenVersion?: number) {
  const payload: Record<string, any> = { id: user._id };
  if (sessionId) payload.jti = sessionId;
  if (tokenVersion !== undefined) payload.ver = tokenVersion;
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES || "7d") as any,
  });
}

export function buildTokenPayload(user: any, sessionId?: string, tokenVersion?: number) {
  return {
    tokenType: "Bearer",
    accessToken: generateAccessToken(user, sessionId),
    accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES || "7d",
    refreshToken: generateRefreshToken(user, sessionId, tokenVersion),
  };
}
