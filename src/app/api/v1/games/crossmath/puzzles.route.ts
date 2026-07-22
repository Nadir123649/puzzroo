import { NextRequest } from "next/server"
import { withAuth } from "./route-helpers"
import { randomPuzzleEngine } from "@/lib/server/puzzles/crossmath/services/RandomPuzzleEngine"
import { successResponse } from "@/lib/server/utils/apiResponse"

// Phase 2: Puzzle Browser API - list all puzzles with shapes filtering
export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const shapeName = url.searchParams.get("shapeName") || undefined
  const page = parseInt(url.searchParams.get("page") || "1")
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20")
  const difficulty = url.searchParams.get("difficulty") || undefined

  const result = await randomPuzzleEngine.selectRandom({
    userId: user.id,
    difficulty: difficulty as any || undefined,
    excludeCompleted: true,
    excludeActive: true,
    excludeRecentAbandons: true,
  }, page, pageSize, shapeName || undefined)

  const enriched = result.puzzles.map(doc => {
    return {
      id: doc.id,
      difficulty: doc.difficulty,
      patternId: doc.patternId,
      patternShape: doc.patternShape,
      patternSize: doc.patternSize,
      blanksCount: doc.blanksCount,
      availableNumbers: doc.availableNumbers,
      maxMistakes: doc.maxMistakes,
      totalNumbers: doc.totalNumbers,
    }
  })

  return successResponse({
    puzzles: enriched,
    pagination: {
      page,
      pageSize,
      total: result.pagination.total,
      totalCount: result.pagination.totalCount,
    },
  })
})