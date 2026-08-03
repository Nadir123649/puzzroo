import { NextRequest } from "next/server"
import { auth } from "@/lib/server/middleware/auth"
import { connectDB } from "@/lib/server/db"
import { randomPuzzleEngine } from "@/lib/server/puzzles/tangram/services/RandomPuzzleEngine"
import { tangramToResponse } from "@/lib/server/puzzles/tangram"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { cacheHeaders, rateLimit } from "@/lib/server/utils/http"
import { tangramDifficultySchema } from "@/lib/server/puzzles/tangram/validators"

export async function GET(request: NextRequest) {
  if (!rateLimit(request, "tangram-puzzle", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const url = new URL(request.url)
  const diffParam = url.searchParams.get("difficulty") || undefined
  const excludeParam = url.searchParams.get("exclude") || undefined

  const parsedDiff = tangramDifficultySchema.safeParse(diffParam)
  const difficulty = parsedDiff.success ? parsedDiff.data : undefined

  await connectDB()

  let userId = "anonymous"
  const authResult = await auth(request)
  if (!("error" in authResult)) {
    userId = authResult.user.id
  } else {
    const guestId = request.headers.get("x-guest-id")
    if (guestId) userId = guestId
  }

  try {
    const puzzle = await randomPuzzleEngine.selectPuzzleForPlayer({
      userId,
      difficulty,
      excludeId: excludeParam,
    })

    const response = tangramToResponse(puzzle)
    const res = successResponse(response)
    Object.entries(cacheHeaders(30)).forEach(([k, v]) => res.headers.set(k, v))
    return res
  } catch (error: any) {
    const code = error.message || "internal_error"
    if (code === "no_puzzles_available") {
      return errorResponse(404, "no_puzzles_available", "No puzzles available.")
    }
    console.error("[tangram/puzzle]", error)
    return errorResponse(500, "internal_error", "An unexpected error occurred.")
  }
}
