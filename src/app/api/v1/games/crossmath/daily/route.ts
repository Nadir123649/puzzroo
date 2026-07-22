import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import { randomPuzzleEngine } from "@/lib/server/puzzles/crossmath/services/RandomPuzzleEngine"
import { cacheHeaders } from "@/lib/server/utils/http"

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0]

  const puzzle = await randomPuzzleEngine.selectDailyPuzzle(dateStr)

  const { getPatternById, patternToGameGrid } = await import("@shared/data/crossmath/patterns")
  const pattern = getPatternById(puzzle.patternId)
  const grid = pattern ? patternToGameGrid(pattern) : []

  const headers = cacheHeaders(86400)

  return new Response(
    JSON.stringify({
      success: true,
      payload: {
        id: puzzle.id,
        difficulty: puzzle.difficulty,
        puzzleId: puzzle.id,
        rows: pattern?.grid_rows || 0,
        columns: pattern?.grid_cols || 0,
        grid,
        availableNumbers: puzzle.availableNumbers || [],
        maxMistakes: puzzle.maxMistakes || 3,
        date: dateStr,
      },
      timestamp: Date.now(),
    }),
    { status: 200, headers }
  )
})
