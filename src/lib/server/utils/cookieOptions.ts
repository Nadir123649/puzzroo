import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const cookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
};

// Refresh-cookie variant honoring "Remember me". When remembered the cookie
// persists for `cookieOptions.maxAge` (7 days). When NOT remembered the cookie
// becomes a session cookie (no maxAge) and is cleared when the browser closes,
// forcing a fresh login on the next visit.
export function getRefreshCookieOptions(remember: boolean): Partial<ResponseCookie> {
  const options: Partial<ResponseCookie> = { ...cookieOptions };
  if (!remember) delete options.maxAge;
  return options;
}
