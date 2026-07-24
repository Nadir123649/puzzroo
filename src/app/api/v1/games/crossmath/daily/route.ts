import { NextRequest } from "next/server"
import { randomPuzzleEngine } from "@/lib/server/puzzles/crossmath/services/RandomPuzzleEngine"
import { auth } from "@/lib/server/middleware/auth"
import { cacheHeaders } from "@/lib/server/utils/http"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"

export async function GET(request: NextRequest) {
  const authResult = await auth(request)
  const userId = "error" in authResult ? null : authResult.user.id

  const url = new URL(request.url)
  const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0]

  try {
    const puzzle = await randomPuzzleEngine.selectDailyPuzzle(dateStr)

    const { getPatternById, patternToGameGrid } = await import("@shared/data/crossmath/patterns")
    const pattern = getPatternById(puzzle.patternId)
    const grid = pattern ? patternToGameGrid(pattern) : []

    const blankSet = new Set(puzzle.blanks || [])
    const solution = puzzle.solution || {}
    for (const pc of pattern?.cells || []) {
      if (pc.type === "NUMBER") {
        const key = `${pc.row}-${pc.col}`
        const cell = grid[pc.row]?.[pc.col]
        if (!cell) continue
        if (blankSet.has(key)) {
          cell.isEditable = true
          cell.type = "empty"
          cell.value = undefined
        } else {
          cell.value = solution[key]
          cell.type = "number"
          cell.isEditable = false
        }
      }
    }

    const headers = cacheHeaders(86400)

    return new Response(
      JSON.stringify({
        success: true,
        payload: {
          id: puzzle.id,
          difficulty: puzzle.difficulty,
          patternId: puzzle.patternId,
          rows: pattern?.grid_rows || 0,
          columns: pattern?.grid_cols || 0,
          grid,
          availableNumbers: puzzle.availableNumbers || [],
          maxMistakes: puzzle.maxMistakes || 3,
          solution: puzzle.solution || {},
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
