import { NextRequest } from "next/server"
import { auth } from "@/lib/server/middleware/auth"
import { connectDB } from "@/lib/server/db"
import { randomPuzzleEngine } from "@/lib/server/puzzles/crossmath/services/RandomPuzzleEngine"
import { successResponse } from "@/lib/server/utils/apiResponse"
import { puzzleQuerySchema } from "@/lib/server/puzzles/crossmath/validators"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const parsed = puzzleQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    )
  }

  await connectDB()

  // Auth-optional: use user ID if available, otherwise anonymous
  let userId = "anonymous"
  const authResult = await auth(request)
  if (!("error" in authResult)) {
    userId = authResult.user.id
  }

  try {
    const puzzle = await randomPuzzleEngine.selectPuzzleForPlayer({
      userId,
      difficulty: parsed.data.difficulty,
    })

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

    const response = {
      id: puzzle.id,
      difficulty: puzzle.difficulty,
      patternId: puzzle.patternId,
      rows: puzzle.rows,
      columns: puzzle.columns,
      grid,
      availableNumbers: puzzle.availableNumbers,
      maxMistakes: puzzle.maxMistakes,
      solution: puzzle.solution || {},
    }

    return successResponse(response, 200)
  } catch (error: any) {
    const code = error.message || "internal_error"
    return Response.json(
      { success: false, payload: { error: { code, message: code === "no_puzzles_available" ? "No puzzles available." : "An unexpected error occurred." } }, timestamp: Date.now() },
      { status: code === "no_puzzles_available" ? 404 : 500 }
    )
  }
}
