import { NextRequest } from "next/server"
import { randomPuzzleEngine } from "@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine"
import { auth } from "@/lib/server/middleware/auth"
import { cacheHeaders } from "@/lib/server/utils/http"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { nonogramToResponse } from "@/lib/server/puzzles/nonogram"

export async function GET(request: NextRequest) {
  const authResult = await auth(request)
  const userId = "error" in authResult ? null : authResult.user.id

  const url = new URL(request.url)
  const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0]
  const difficulty = url.searchParams.get("difficulty") as any

  try {
    const doc = await randomPuzzleEngine.selectDailyPuzzle(dateStr, difficulty)
    const headers = cacheHeaders(86400)

    return new Response(
      JSON.stringify({
        success: true,
        payload: {
          ...nonogramToResponse(doc),
          date: dateStr,
        },
        timestamp: Date.now(),
      }),
      { status: 200, headers }
    )
  } catch (error: any) {
    if (error.message === "no_daily_puzzles_available") {
      return errorResponse(404, "no_daily_puzzle", "No daily puzzle available")
    }

    return errorResponse(500, "internal_error", "Internal Server Error")
  }
}