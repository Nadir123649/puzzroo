import { NextRequest } from "next/server"
import { connectDB } from "@/lib/server/db"
import { randomPuzzleEngine } from "@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine"
import { nonogramToResponse } from "@/lib/server/puzzles/nonogram"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export async function GET(request: NextRequest) {
  if (!rateLimit(request, "nonogram-puzzles", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const url = new URL(request.url)
  const difficulty = url.searchParams.get("difficulty") || undefined
  const cursor = url.searchParams.get("cursor") || undefined
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100)

  try {
    await connectDB()

    if (!difficulty) {
      const summary = await randomPuzzleEngine.getCatalogSummary()
      return successResponse(summary)
    }

    const docs = await randomPuzzleEngine.getPuzzlesByDifficulty(difficulty, cursor, limit)
    const items = docs.map(doc => nonogramToResponse(doc))

    return successResponse({
      items,
      puzzles: items,
      nextCursor: items.length === limit ? String(docs[docs.length - 1]._id) : null,
      cursor: items.length === limit ? String(docs[docs.length - 1]._id) : null,
    })
  } catch (error: any) {
    console.error("[nonogram/puzzles]", error)
    return errorResponse(500, "internal_error", "Internal Server Error")
  }
}
