import { NextRequest } from "next/server"
import { auth } from "@/lib/server/middleware/auth"
import { connectDB } from "@/lib/server/db"
import { randomPuzzleEngine } from "@/lib/server/puzzles/crossmath/services/RandomPuzzleEngine"
import { successResponse } from "@/lib/server/utils/apiResponse"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  const { puzzleId } = await params
  await connectDB()

  // Auth-optional: use user ID if available, otherwise anonymous
  let userId = "anonymous"
  const authResult = await auth(request)
  if (!("error" in authResult)) {
    userId = authResult.user.id
  }

  try {
    const puzzle = await randomPuzzleEngine.selectPuzzleById(puzzleId)

    const { getPatternById, patternToGameGrid } = await import("@shared/data/crossmath/patterns")
    const pattern = getPatternById(puzzle.patternId)
    const grid = pattern ? patternToGameGrid(pattern) : []

    // Apply blanks and solution values
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

    return successResponse({
      id: puzzle.id,
      difficulty: puzzle.difficulty,
      patternId: puzzle.patternId,
      puzzleId: puzzle.id,
      rows: pattern?.grid_rows || 0,
      columns: pattern?.grid_cols || 0,
      grid,
      availableNumbers: puzzle.availableNumbers || [],
      maxMistakes: puzzle.maxMistakes || 3,
      solution: puzzle.solution || {},
    })
  } catch (error: any) {
    const code = error.message || "internal_error"
    return Response.json(
      { success: false, payload: { error: { code, message: code === "puzzle_not_found" ? "Puzzle not found." : "An unexpected error occurred." } }, timestamp: Date.now() },
      { status: code === "puzzle_not_found" ? 404 : 500 }
    )
  }
}
