import { NextRequest } from "next/server"
import { connectDB } from "@/lib/server/db"
import { randomPuzzleEngine } from "@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine"
import { nonogramToResponse } from "@/lib/server/puzzles/nonogram"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { cacheHeaders, rateLimit } from "@/lib/server/utils/http"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(request, "nonogram-puzzle-id", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  try {
    await connectDB()
    const { id } = await params

    const doc = await randomPuzzleEngine.selectPuzzleById(id)
    if (!doc) return errorResponse(404, "puzzle_not_found", "Puzzle not found.")

    const response = nonogramToResponse(doc)
    const res = successResponse(response)
    Object.entries(cacheHeaders(86400)).forEach(([k, v]) => res.headers.set(k, v))
    return res
  } catch (error: any) {
    if (error.message === "puzzle_not_found") {
      return errorResponse(404, "puzzle_not_found", "Puzzle not found.")
    }
    console.error("[nonogram/puzzle/[id]]", error)
    return errorResponse(500, "internal_error", "Internal Server Error")
  }
}
