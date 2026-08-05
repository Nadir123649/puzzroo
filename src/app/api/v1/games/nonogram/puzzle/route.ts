import { NextRequest } from "next/server"
import { auth } from "@/lib/server/middleware/auth"
import { connectDB } from "@/lib/server/db"
import { randomPuzzleEngine } from "@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine"
import { nonogramToResponse } from "@/lib/server/puzzles/nonogram"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"
import { nonogramDifficultySchema } from "@/lib/server/puzzles/nonogram/validators"

export async function GET(request: NextRequest) {
  if (!rateLimit(request, "nonogram-puzzle", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const url = new URL(request.url)
  const diffParam = url.searchParams.get("difficulty") || undefined
  const excludeParam = url.searchParams.get("exclude") || undefined

  const parsedDiff = nonogramDifficultySchema.safeParse(diffParam)
  const difficulty = parsedDiff.success ? parsedDiff.data : undefined

  await connectDB()

  let userId: string | undefined
  let guestId: string | undefined
  const authResult = await auth(request)
  if (!("error" in authResult)) {
    userId = authResult.user.id
  } else {
    const gid = request.headers.get("x-guest-id")
    if (gid) guestId = gid
  }

  try {
    const puzzle = await randomPuzzleEngine.selectPuzzleForPlayer({
      userId,
      guestId,
      difficulty,
      excludeId: excludeParam,
    })

    const response = nonogramToResponse(puzzle)
    const res = successResponse(response)
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (error: any) {
    const code = error.message || "internal_error"
    if (code === "no_puzzles_available") {
      return errorResponse(404, "no_puzzles_available", "No puzzles available.")
    }
    console.error("[nonogram/puzzle]", error)
    return errorResponse(500, "internal_error", "An unexpected error occurred.")
  }
}
