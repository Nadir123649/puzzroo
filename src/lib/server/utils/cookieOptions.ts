import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const cookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
};
