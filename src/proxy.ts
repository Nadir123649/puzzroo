import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authPages = ["/login", "/signup", "/forgot-password", "/reset-password"];

const protectedPages = [
  "/account-information",
  "/billing-history",
  "/email-preferences",
  "/subscription",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  const isAuthPage = authPages.some((p) => pathname.startsWith(p));
  const isProtectedPage = protectedPages.some((p) => pathname.startsWith(p));

  if (isAuthPage && refreshToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtectedPage && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};
