import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPages = [
  "/account-information",
  "/billing-history",
  "/email-preferences",
  "/subscription",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (protectedPages.some((p) => pathname.startsWith(p)) && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};
