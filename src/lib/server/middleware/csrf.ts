import { NextRequest } from "next/server"
import { errorResponse } from "../utils/apiResponse"

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[]

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  if (!origin && !referer) return true

  const checkOrigin = origin || referer
  if (!checkOrigin) return true

  return ALLOWED_ORIGINS.some(allowed => checkOrigin.startsWith(allowed))
}

export function csrfProtection(request: NextRequest) {
  const method = request.method.toUpperCase()
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null

  const csrfHeader = request.headers.get("x-csrf-token")
  const csrfCookie = request.cookies.get("csrf-token")?.value

  if (csrfHeader && csrfCookie && csrfHeader === csrfCookie) return null

  const hasCustomHeader = request.headers.has("x-requested-with") ||
    request.headers.has("x-forwarded-for")

  if (hasCustomHeader) return null

  if (!validateOrigin(request)) {
    return errorResponse(403, "forbidden", "Request blocked by CSRF protection")
  }

  return null
}
